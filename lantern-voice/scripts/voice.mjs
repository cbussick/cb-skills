#!/usr/bin/env node
import { resolve, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inspectScene, buildNarration } from './build.mjs';
import { getVoice } from './speech.mjs';
import { createGoogleSynthesizer } from './googleSpeech.mjs';

const skillDirectory = fileURLToPath(new URL('../', import.meta.url));
const installer = resolve(skillDirectory, '../lantern/scripts/lantern.sh');
const dataDirectory = process.env.LANTERN_VOICE_HOME ?? join(process.env.XDG_DATA_HOME ?? join(process.env.HOME, '.local/share'), 'lantern-voice');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`${command} failed. Check the output above.`);
}

async function main(args) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24 or newer.');
  const [command, ...rest] = args;
  if (!command || ['--help', '-h', 'help'].includes(command)) {
    console.log(`Usage: node voice.mjs COMMAND
  setup                                  Check gcloud and install Lantern
  new DIRECTORY                          Create an independent Lantern workspace
  plan WORKSPACE MODULE EXPORT [--language en-US|de-DE]
                                         Inspect captions without calling Google
  build WORKSPACE MODULE EXPORT [--language en-US|de-DE] [--generate]
                                         Build from cached audio; --generate permits Google calls
Default: en-US (Despina). German: de-DE (Achernar). Modules are workspace-relative paths.`);
    return;
  }
  if (!isAbsolute(dataDirectory)) throw new Error('LANTERN_VOICE_HOME / XDG_DATA_HOME must be absolute.');
  if (command === 'setup') {
    if (rest.length) throw new Error('setup takes no arguments.');
    run('gcloud', ['version']);
    run('bash', [installer, 'setup']);
    return;
  }
  if (command === 'new') {
    if (rest.length !== 1) throw new Error('Usage: voice.mjs new DIRECTORY');
    run('bash', [installer, 'new', rest[0]]);
    return;
  }
  if (!['plan', 'build'].includes(command)) throw new Error('Unknown command. Run with --help.');
  let allowGeneration = false;
  let language = 'en-US';
  let hasLanguage = false;
  const positional = [];
  for (let index = 0; index < rest.length; index++) {
    const argument = rest[index];
    if (argument === '--generate') {
      if (allowGeneration) throw new Error('Duplicate --generate.');
      allowGeneration = true;
    } else if (argument === '--language') {
      if (hasLanguage || !rest[index + 1] || rest[index + 1].startsWith('--')) throw new Error('Provide --language en-US or de-DE once.');
      hasLanguage = true;
      language = rest[++index];
    } else {
      if (argument.startsWith('--')) throw new Error(`Unknown option: ${argument}`);
      positional.push(argument);
    }
  }
  const voice = getVoice(language);
  if (positional.length !== 3 || (command === 'plan' && allowGeneration)) throw new Error('Provide WORKSPACE MODULE EXPORT; only build accepts --generate.');
  const scene = await inspectScene(...positional, language);
  if (command === 'plan') {
    console.log(JSON.stringify({ language, voice: voice.name, steps: scene.trace.steps.map((step) => ({
      step: step.step, caption: step.meta.caption, bytes: Buffer.byteLength(step.meta.caption, 'utf8'),
    })) }, null, 2));
    return;
  }

  const synthesize = allowGeneration ? createGoogleSynthesizer() : undefined;
  const result = await buildNarration(scene, join(dataDirectory, 'audio'), synthesize);
  console.log(result.path);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`lantern-voice: ${error.message}`);
  process.exitCode = 1;
});
