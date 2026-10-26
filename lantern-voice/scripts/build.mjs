import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join, basename, relative, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { prepareClips, assembleNarration, voiceName, speechRequest } from './speech.mjs';
import { makeNarratedScene, validateSteps } from './timing.mjs';

const skillDirectory = fileURLToPath(new URL('../', import.meta.url));

function replaceOnce(text, before, after) {
  if (text.split(before).length !== 2) throw new Error('Lantern player differs from the pinned version. Review the voice integration before building.');
  return text.replace(before, after);
}

export function narratedPlayer(source) {
  let text = replaceOnce(source, "import { DomSink,", "import { voiceClock } from 'virtual:voice-clock';\nimport { DomSink,");
  text = replaceOnce(text, 'let paused = false, pauseAtSteps = false;', 'let paused = true, pauseAtSteps = false;');
  text = replaceOnce(text, '    paused = p;', '    paused = p;\n    if (p) voiceClock.pause(); else voiceClock.play();');
  text = replaceOnce(text,
    '    setPaused(false); // also releases a run parked on the pause promise so it can abort',
    '    voiceClock.pause();\n    if (resume) { const r = resume; resume = null; r(); }\n    setPaused(true);');
  text = replaceOnce(text,
    '    const startAt = t ?? (step ? stepTime(index, step) ?? 0 : 0);',
    '    const requested = t ?? (step ? stepTime(index, step) ?? 0 : 0);\n    const startAt = Number.isFinite(requested) ? Math.max(0, Math.min(index.duration, requested)) : 0;\n    voiceClock.seek(startAt);\n    setPaused(true);');
  text = replaceOnce(text,
    "const dom = new DomSink(stageInner, { background: '#0a0a0a' });",
    "const dom = new DomSink(stageInner, { background: '#0a0a0a', realtime: false });");
  const oldFrame = `      async frame(scene: Scene, dt: number) {
        if (gen !== generation) throw new Abort();
        if (scene.time + 1e-9 >= startAt) {
          if (firstLive) { firstLive = false; root.classList.remove('loading'); endSeek(); }
          setTime(scene.time);
          setActive(scene.currentStep?.name ?? activeStep);
          if (paused) await new Promise<void>((r) => { resume = r; });
          if (gen !== generation) throw new Abort();
        }
        await seek.frame(scene, dt);
      },`;
  const newFrame = `      async frame(scene: Scene, dt: number) {
        if (gen !== generation) throw new Abort();
        if (scene.time + 1e-9 < startAt || (!scene.currentStep && scene.time === 0)) { await seek.frame(scene, dt); return; }
        if (firstLive) {
          firstLive = false; root.classList.remove('loading'); endSeek();
          setTime(scene.time); setActive(index.steps[stepIndexAt(scene.time)]?.name ?? activeStep);
          await seek.frame(scene, 0);
        }
        if (paused) await new Promise<void>((r) => { resume = r; });
        await voiceClock.waitUntil(scene.time, () => gen !== generation);
        if (gen !== generation) throw new Abort();
        setTime(scene.time); setActive(index.steps[stepIndexAt(scene.time)]?.name ?? activeStep);
        await seek.frame(scene, dt);
      },`;
  text = replaceOnce(text, oldFrame, newFrame);
  text = replaceOnce(text,
    "    try { await scene.run(); } catch (e) { if (!(e instanceof Abort)) throw e; return; }",
    "    try { await scene.run(); } catch (e) { if (gen === generation && !(e instanceof Abort)) { setPaused(true); say('Narration failed. Reload and try again.'); } return; }");
  text = replaceOnce(text, "  root.dataset.mounted = '1';", `  root.dataset.mounted = '1';
  document.addEventListener('lantern:voice-error', () => { setPaused(true); say('Audio could not play. Reload and press Play.'); });`);
  const fonts = `  if (!document.querySelector('link[data-ui-fonts]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.dataset.uiFonts = '';
    l.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap';
    document.head.append(l);
  }`;

  return replaceOnce(text, fonts, '  // Offline player: scene fonts are embedded; UI uses local fallback fonts.');
}

export async function inspectScene(workspace, modulePath, exportName) {
  const root = await realpath(workspace);
  const module = await realpath(resolve(root, modulePath));
  const location = relative(root, module);
  if (location.startsWith('..') || isAbsolute(location)) throw new Error('Scene module must be inside the workspace.');
  if (!/^[A-Za-z_$][\w$]*$/.test(exportName)) throw new Error('Provide the scene class export name.');
  const key = basename(module).replace(/\.[^.]+$/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) throw new Error('Scene filename must be kebab-case.');
  const api = await import(pathToFileURL(join(root, 'src/index.ts')).href);
  const exports = await import(pathToFileURL(module).href);
  const Scene = exports[exportName];
  if (typeof Scene !== 'function') throw new Error(`No scene class export named ${exportName}.`);
  const trace = await api.traceScene(Scene);
  validateSteps(trace);
  // Validate every input before any call to Google.
  for (const step of trace.steps) speechRequest(step.meta.caption);

  return { root, module, exportName, key, Scene, api, trace };
}

export async function buildNarration(scene, cacheDirectory, synthesize) {
  // Fail on unsupported player versions before generating billable speech.
  narratedPlayer(await readFile(join(scene.root, 'app/player.ts'), 'utf8'));
  const requireWorkspace = createRequire(join(scene.root, 'package.json'));
  const { build } = requireWorkspace('esbuild');
  const clips = await prepareClips(scene.trace.steps, cacheDirectory, synthesize);
  const durations = Object.fromEntries(clips.map((clip) => [clip.step, clip.duration]));
  const NarratedScene = makeNarratedScene(scene.Scene, durations);
  const trace = await scene.api.traceScene(NarratedScene);
  validateSteps(trace);
  const story = (steps) => steps.map((step) => [step.step, step.meta.caption, step.before, step.after]);
  if (JSON.stringify(story(trace.steps)) !== JSON.stringify(story(scene.trace.steps))) {
    throw new Error('Adding narration changed the story state or captions. Use time-independent scene logic.');
  }
  const wav = assembleNarration(trace, clips);
  const playerPath = join(scene.root, 'app/player.ts');
  const registryPath = join(scene.root, 'scenes/index.ts');
  const clockPath = join(skillDirectory, 'assets/voiceClock.mjs');
  const timingPath = join(skillDirectory, 'scripts/timing.mjs');
  const registrySource = `import { ${scene.exportName} as SourceScene } from ${JSON.stringify(scene.module)};
import { makeNarratedScene } from ${JSON.stringify(timingPath)};
export const SCENES = { ${JSON.stringify(scene.key)}: {
  label: ${JSON.stringify(scene.key)}, Scene: makeNarratedScene(SourceScene, ${JSON.stringify(durations)})
} };`;
  const clockSource = `import { createVoiceClock } from ${JSON.stringify(clockPath)};
export const narrationAudio = new Audio(${JSON.stringify(`data:audio/wav;base64,${wav.toString('base64')}`)});
narrationAudio.preload = 'auto';
export const voiceClock = createVoiceClock(narrationAudio, () => document.dispatchEvent(new Event('lantern:voice-error')));`;
  const entry = `import { mountPlayer } from ${JSON.stringify(playerPath)};
import { narrationAudio } from 'virtual:voice-clock';
narrationAudio.hidden = true; document.body.append(narrationAudio);
mountPlayer(document.querySelector('main'));
const mute = document.createElement('button');
mute.className = 'toggle'; mute.textContent = 'Mute narration'; mute.setAttribute('aria-pressed', 'false');
mute.addEventListener('click', () => { narrationAudio.muted = !narrationAudio.muted; mute.setAttribute('aria-pressed', String(narrationAudio.muted)); mute.textContent = narrationAudio.muted ? 'Unmute narration' : 'Mute narration'; });
document.querySelector('.actions').append(mute);`;
  const result = await build({
    stdin: { contents: entry, resolveDir: scene.root, sourcefile: 'lantern-voice-entry.js' },
    tsconfig: join(scene.root, 'tsconfig.app.json'),
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
    define: { __ONLY__: JSON.stringify(scene.key) },
    plugins: [{
      name: 'lantern-voice',
      setup(plugin) {
        plugin.onResolve({ filter: /^virtual:voice-clock$/ }, () => ({ path: 'clock', namespace: 'voice' }));
        plugin.onLoad({ filter: /.*/, namespace: 'voice' }, () => ({ contents: clockSource, loader: 'js', resolveDir: scene.root }));
        plugin.onLoad({ filter: /[/\\]app[/\\]player\.ts$/ }, async ({ path }) => {
          if (resolve(path) === playerPath) return { contents: narratedPlayer(await readFile(path, 'utf8')), loader: 'ts' };
        });
        plugin.onLoad({ filter: /[/\\]scenes[/\\]index\.ts$/ }, ({ path }) => {
          if (resolve(path) === registryPath) return { contents: registrySource, loader: 'js', resolveDir: scene.root };
        });
      },
    }],
  });
  const css = await readFile(join(scene.root, 'app/player.css'), 'utf8');
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lantern Voice</title><style>${css}</style></head><body><main></main><p style="padding:0 24px;font:12px system-ui;color:#888">AI-generated English narration · Google Chirp 3 HD · Despina. Press Play to start.</p><script type="module">${js}</script></body></html>`;
  const outputDirectory = join(scene.root, 'out/voice', scene.key);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, 'index.html'), html);
  await writeFile(join(outputDirectory, 'narration.wav'), wav);
  const manifest = { voice: voiceName, module: relative(scene.root, scene.module), exportName: scene.exportName, trace,
    clips: clips.map(({ step, hash, duration }) => ({ step, hash, duration })) };
  await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const transcript = trace.steps.map((step) => `## ${step.step} (${step.t0.toFixed(2)}–${step.t1.toFixed(2)}s)\n\n${step.meta.caption}\n`).join('\n');
  await writeFile(join(outputDirectory, 'transcript.md'), `# English narration\n\n${transcript}`);

  return { path: join(outputDirectory, 'index.html'), manifest };
}
