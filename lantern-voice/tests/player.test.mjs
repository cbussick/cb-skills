import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { inspectScene, buildNarration, narratedPlayer } from '../scripts/build.mjs';
import { writeWav, sampleRate } from '../scripts/speech.mjs';

const workspace = process.env.LANTERN_TEST_WORKSPACE;

test('unsupported players fail closed', () => {
  assert.throws(() => narratedPlayer('different player'), /pinned version/);
});

test('narrated artifact: offline build, audio timing, pause, seek, step mode, mute, and restart', { skip: !workspace }, async (t) => {
  const cache = await mkdtemp(join(tmpdir(), 'lantern-voice-browser-cache-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  await writeFile(join(workspace, 'scenes/voice-test.ts'), `import { Scene, Rectangle, FadeIn, FadeOut } from '../src/index.ts';
export class VoiceTest extends Scene {
  override async construct() {
    this.state = { replied: false };
    await this.step('request', { caption: 'A request arrives.' });
    const box = new Rectangle({ width: 3, height: 1 });
    await this.play(new FadeIn(box), { runTime: 0.3 });
    await this.step('reply', { caption: 'The reply returns.' });
    this.state.replied = true;
    await this.play(new FadeOut(box), { runTime: 0.3 });
  }
}`);
  // This private marker must not be bundled: only the requested module is included.
  await writeFile(join(workspace, 'scenes/private-unrelated.ts'), 'export const unrelated = "DO_NOT_BUNDLE_UNRELATED_SCENES";');
  const scene = await inspectScene(workspace, 'scenes/voice-test.ts', 'VoiceTest');
  let calls = 0;
  const result = await buildNarration(scene, cache, async () => {
    calls++;
    const pcm = Buffer.alloc(sampleRate * 2 * 1.8);
    for (let index = 0; index < pcm.length / 2; index++) pcm.writeInt16LE(Math.round(Math.sin(index * Math.PI * 2 * 440 / sampleRate) * 1000), index * 2);
    return writeWav(pcm);
  });
  assert.equal(calls, 2);
  assert.equal(result.manifest.voice, 'en-US-Chirp3-HD-Despina');
  for (let index = 0; index < result.manifest.trace.steps.length; index++) {
    const step = result.manifest.trace.steps[index];
    assert.ok(step.t1 - step.t0 >= result.manifest.clips[index].duration + 0.19);
  }
  const cached = await buildNarration(scene, cache);
  assert.equal(cached.path, result.path);
  assert.equal(calls, 2);
  const html = await readFile(result.path, 'utf8');
  assert.ok(!html.includes('DO_NOT_BUNDLE_UNRELATED_SCENES'));
  assert.ok(!html.includes('fonts.googleapis.com'));
  assert.ok(!html.includes('private_key'));

  const requireWorkspace = createRequire(join(workspace, 'package.json'));
  const { chromium } = requireWorkspace('playwright-core');
  const browser = await chromium.launch({ executablePath: process.env.LANTERN_TEST_CHROMIUM });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(pathToFileURL(result.path).href);
  await page.waitForSelector('main.paused .stage-svg svg');
  await page.waitForFunction(() => document.querySelector('audio').readyState >= 1);
  assert.equal(await page.locator('audio').evaluate((audio) => audio.currentTime), 0);

  const play = page.getByRole('button', { name: 'Play/Pause', exact: true });
  await play.click();
  await page.waitForFunction(() => document.querySelector('audio').currentTime > 0.2);
  const position = await page.evaluate(() => ({
    audio: document.querySelector('audio').currentTime,
    visual: Number(document.querySelector('.scrubber').getAttribute('aria-valuenow')),
  }));
  assert.ok(Math.abs(position.audio - position.visual) < 0.15, JSON.stringify(position));
  await play.click();
  const stopped = await page.locator('audio').evaluate((audio) => audio.currentTime);
  await page.waitForTimeout(180);
  assert.equal(await page.locator('audio').evaluate((audio) => audio.currentTime), stopped);

  await page.getByRole('button', { name: 'Mute narration', exact: true }).click();
  assert.equal(await page.locator('audio').evaluate((audio) => audio.muted), true);
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.step[aria-current="step"]')?.getAttribute('data-step') === 'reply');
  const replyTime = result.manifest.trace.steps[1].t0;
  assert.ok(Math.abs(await page.locator('audio').evaluate((audio) => audio.currentTime) - replyTime) < 0.05);
  assert.equal(await page.locator('audio').evaluate((audio) => audio.paused), true);
  await play.click();
  await page.waitForFunction(() => document.querySelector('main').classList.contains('ended'));

  // Restart at zero and pause on the next step boundary.
  await page.getByRole('button', { name: 'Previous step', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('audio').currentTime < 0.1);
  await page.getByRole('button', { name: 'Step mode', exact: true }).click();
  await play.click();
  await page.waitForFunction(() => document.querySelector('main').classList.contains('paused') && document.querySelector('.step[aria-current="step"]')?.getAttribute('data-step') === 'reply', null, { timeout: 8000 }).catch(async (error) => {
    console.error(await page.evaluate(() => ({ classes: document.querySelector('main').className, time: document.querySelector('.time').textContent, audioTime: document.querySelector('audio').currentTime, paused: document.querySelector('audio').paused, toast: document.querySelector('.toast').textContent, step: document.querySelector('.step[aria-current="step"]')?.getAttribute('data-step') })));
    throw error;
  });
  assert.ok(Math.abs(await page.locator('audio').evaluate((audio) => audio.currentTime) - replyTime) < 0.1);

  // Arbitrary timeline seek stays paused, with a frame preview.
  await page.locator('.scrubber').click({ position: { x: 20, y: 2 } });
  await page.waitForFunction(() => document.querySelector('audio').currentTime < 1);
  assert.equal(await page.locator('audio').evaluate((audio) => audio.paused), true);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(workspace, 'out/voice/voice-test/player-test.png'), fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
});
