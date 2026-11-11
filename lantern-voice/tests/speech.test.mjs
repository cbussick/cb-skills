import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { speechRequest, readWav, writeWav, prepareClips, assembleNarration, voiceName, sampleRate } from '../scripts/speech.mjs';
import { validateSteps, makeNarratedScene } from '../scripts/timing.mjs';
import { createVoiceClock } from '../assets/voiceClock.mjs';

const step = (name, caption) => ({ step: name, t0: 0, t1: 2, meta: { caption } });
const tone = (duration) => writeWav(Buffer.alloc(Math.round(duration * sampleRate) * 2, 1));

// Synthetic audio here tests timing, not speech quality; no Google requests are made.
test('synthesis defaults to English Despina and measurable mono WAV', () => {
  assert.deepEqual(speechRequest('A request arrives.'), {
    input: { text: 'A request arrives.' }, voice: { languageCode: 'en-US', name: voiceName },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: sampleRate },
  });
  assert.throws(() => speechRequest(' '));
  assert.throws(() => speechRequest('é'.repeat(2501)), /5,000/);
});

test('German uses Vokhanhbel Achernar; unsupported languages are rejected', () => {
  assert.deepEqual(speechRequest('Eine Anfrage kommt an.', 'de-DE'), {
    input: { text: 'Eine Anfrage kommt an.' },
    voice: { languageCode: 'de-DE', name: 'de-DE-Chirp3-HD-Achernar' },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: sampleRate },
  });
  assert.throws(() => speechRequest('Bonjour.', 'fr-FR'), /Unsupported language/);
  assert.throws(() => speechRequest('Hallo.', 'toString'), /Unsupported language/);
});

test('language changes use separate cached clips without invalidating English', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'lantern-voice-language-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const requests = [];
  const synthesize = async (request) => { requests.push(request); return tone(0.5); };
  const steps = [step('same', 'Hello / Hallo.')];
  const english = await prepareClips(steps, directory, synthesize);
  await assert.rejects(prepareClips(steps, directory, undefined, 'de-DE'), /--generate/);
  const german = await prepareClips(steps, directory, synthesize, 'de-DE');
  assert.notEqual(english[0].hash, german[0].hash);
  assert.equal(requests[1].voice.name, 'de-DE-Chirp3-HD-Achernar');
  await prepareClips(steps, directory, undefined, 'de-DE');
  await prepareClips(steps, directory);
  assert.equal(requests.length, 2);
  await assert.rejects(prepareClips(steps, directory, synthesize, 'fr-FR'), /Unsupported language/);
  assert.equal(requests.length, 2);
});

test('WAV duration comes from samples, not estimates; malformed audio is rejected', () => {
  assert.equal(readWav(tone(1.25)).duration, 1.25);
  assert.throws(() => readWav(Buffer.alloc(44)), /WAV/);
  const truncated = tone(1).subarray(0, 50);
  assert.throws(() => readWav(truncated), /Truncated/);
  const stereo = tone(1);
  stereo.writeUInt16LE(2, 22);
  assert.throws(() => readWav(stereo), /mono/);
});

test('clips are cached by complete request; only changed captions regenerate', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'lantern-voice-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const calls = [];
  const synthesize = async (request) => { calls.push(request); return tone(0.5); };
  const steps = [step('before', 'Before.'), step('after', 'After.')];
  const first = await prepareClips(steps, directory, synthesize);
  assert.equal(calls.length, 2);
  assert.equal((await prepareClips(steps, directory)).length, 2);
  await prepareClips([steps[0], step('after', 'Changed.')], directory, synthesize);
  assert.equal(calls.length, 3);
  assert.equal(readWav(await readFile(join(directory, `${first[0].hash}.wav`))).duration, 0.5);
  await assert.rejects(prepareClips([step('missing', 'Missing.')], directory), /--generate/);
  await writeFile(join(directory, `${first[0].hash}.wav`), 'corrupt');
  await assert.rejects(prepareClips([steps[0]], directory, synthesize), /WAV/);
});

test('all captions validate before any billable request', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'lantern-voice-validate-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let calls = 0;
  await assert.rejects(prepareClips([step('valid', 'Valid.'), step('invalid', '')], directory, async () => { calls++; return tone(1); }));
  assert.equal(calls, 0);
});

test('timing wrapper holds until speech finishes, rounded up to a scene frame', async () => {
  class Base {
    fps = 30; time = 0.5; current = { name: 'request', t0: 0 };
    async wait(duration) { this.time += duration; }
    async endCurrentStep() { this.current = null; }
  }
  const Narrated = makeNarratedScene(Base, { request: 1.11 });
  const scene = new Narrated();
  await scene.endCurrentStep();
  assert.ok(scene.time >= 1.31 && scene.time < 1.31 + 1 / 30);
  assert.equal(scene.current, null);
});

test('step validation rejects duplicate names, missing captions, and an unnamed intro', () => {
  assert.throws(() => validateSteps({ steps: [] }));
  assert.throws(() => validateSteps({ steps: [step('same', 'One.'), step('same', 'Two.')] }), /unique/);
  assert.throws(() => validateSteps({ steps: [step('request', '')] }), /caption/);
  assert.throws(() => validateSteps({ steps: [{ ...step('request', 'Request.'), t0: 1 }] }), /time zero/);
});

test('master track places clips at step boundaries and rejects overlap', () => {
  const clips = [{ step: 'a', ...readWav(tone(0.5)) }, { step: 'b', ...readWav(tone(0.5)) }];
  const trace = { duration: 3, steps: [{ step: 'a', t0: 0, t1: 1 }, { step: 'b', t0: 1, t1: 3 }] };
  const combined = readWav(assembleNarration(trace, clips));
  assert.equal(combined.duration, 3);
  assert.equal(combined.pcm[sampleRate], 0); // silence after the first half-second
  assert.equal(combined.pcm[sampleRate * 2], 1); // second clip at one second
  assert.throws(() => assembleNarration({ ...trace, steps: [{ step: 'a', t0: 0, t1: 0.1 }] }, clips), /exceeds/);
  assert.throws(() => assembleNarration({ ...trace, duration: Infinity }, clips));
});

test('pausing or seeking cancels a pending play without poisoning later playback', async () => {
  let rejectPlay;
  let failures = 0;
  const audio = { currentTime: 0, ended: false, addEventListener() {}, pause() {},
    play() { return new Promise((resolve, reject) => { rejectPlay = reject; }); },
  };
  const clock = createVoiceClock(audio, () => failures++);
  clock.play();
  clock.seek(1);
  rejectPlay(new Error('Playback was intentionally interrupted.'));
  await Promise.resolve();
  assert.equal(failures, 0);
  clock.play();
  clock.pause();
  rejectPlay(new Error('Playback was intentionally paused.'));
  await Promise.resolve();
  assert.equal(failures, 0);
  clock.play();
  rejectPlay(new Error('Actual playback failure.'));
  await Promise.resolve();
  assert.equal(failures, 1);
});

test('media clock waits for audio, supports cancellation, and reports play failures', async () => {
  let errorHandler;
  const audio = { currentTime: 0, ended: false, paused: true,
    addEventListener(name, callback) { errorHandler = callback; },
    pause() { this.paused = true; },
    async play() { this.paused = false; },
  };
  let frames = 0;
  let failures = 0;
  const clock = createVoiceClock(audio, () => failures++, async () => { frames++; audio.currentTime += 0.1; });
  clock.play();
  await clock.waitUntil(0.5, () => false);
  assert.equal(frames, 5);
  clock.pause();
  assert.equal(audio.paused, true);
  clock.seek(0.2);
  assert.equal(audio.currentTime, 0.2);
  await clock.waitUntil(2, () => true);
  assert.equal(frames, 5);
  errorHandler();
  assert.equal(failures, 1);
  await assert.rejects(clock.waitUntil(2, () => false), /could not play/);
});
