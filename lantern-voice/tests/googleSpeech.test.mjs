import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleSynthesizer } from '../scripts/googleSpeech.mjs';
import { speechRequest, writeWav, sampleRate } from '../scripts/speech.mjs';

const privateToken = 'test-token-not-for-logs';
const wav = writeWav(Buffer.alloc(sampleRate * 2));
const requestBody = speechRequest('A request arrives.');
const audioResponse = () => new Response(JSON.stringify({ audioContent: wav.toString('base64') }), { status: 200 });

test('uses the normal gcloud login and selected project without changing either', async () => {
  const commands = [];
  const requests = [];
  const synthesize = createGoogleSynthesizer({
    runGcloud: async (command, args, options) => {
      commands.push({ command, args, options });
      return { stdout: args[0] === 'config' ? 'speech-project\n' : `${privateToken}\n` };
    },
    request: async (url, options) => { requests.push({ url, options }); return audioResponse(); },
  });
  assert.deepEqual(await synthesize(requestBody), wav);
  assert.deepEqual(await synthesize(requestBody), wav);
  assert.deepEqual(commands.map(({ args }) => args), [
    ['config', 'get-value', 'project', '--quiet'],
    ['auth', 'print-access-token', '--quiet'],
    ['auth', 'print-access-token', '--quiet'],
  ]);
  assert.ok(commands.every(({ command, options }) => command === 'gcloud' && options.timeout === 30000));
  assert.equal(requests[0].url, 'https://texttospeech.googleapis.com/v1/text:synthesize');
  assert.equal(requests[0].options.headers.Authorization, `Bearer ${privateToken}`);
  assert.equal(requests[0].options.headers['x-goog-user-project'], 'speech-project');
  assert.deepEqual(JSON.parse(requests[0].options.body), requestBody);
  assert.equal(requests[0].options.redirect, 'error');
});

test('an explicit project overrides the CLI project but does not alter CLI configuration', async () => {
  const synthesize = createGoogleSynthesizer({
    projectId: 'narration-project',
    runGcloud: async (command, args) => {
      assert.deepEqual(args, ['auth', 'print-access-token', '--quiet']);
      return { stdout: privateToken };
    },
    request: async (url, options) => {
      assert.equal(options.headers['x-goog-user-project'], 'narration-project');
      return audioResponse();
    },
  });
  assert.deepEqual(await synthesize(requestBody), wav);
});

test('missing project fails before requesting a token or calling Google', async () => {
  let calls = 0;
  const synthesize = createGoogleSynthesizer({
    runGcloud: async (command, args) => { calls++; assert.equal(args[0], 'config'); return { stdout: '(unset)' }; },
    request: async () => { assert.fail('Google must not be called'); },
  });
  await assert.rejects(synthesize(requestBody), /select a Google project/i);
  assert.equal(calls, 1);
});

test('CLI failures and malformed tokens never expose stdout or stderr', async () => {
  const synthesize = createGoogleSynthesizer({
    projectId: 'speech-project',
    runGcloud: async () => { throw new Error(`CLI error with stdout ${privateToken}`); },
  });
  await assert.rejects(synthesize(requestBody), (error) => {
    assert.match(error.message, /gcloud auth login/);
    assert.ok(!error.message.includes(privateToken));
    return true;
  });
  const malformed = createGoogleSynthesizer({ projectId: 'speech-project', runGcloud: async () => ({ stdout: `${privateToken}\nextra` }) });
  await assert.rejects(malformed(requestBody), /invalid access token/);
});

for (const status of [401, 403, 429, 500]) {
  test(`HTTP ${status} is reported safely with no automatic generation retry`, async () => {
    let calls = 0;
    const synthesize = createGoogleSynthesizer({
      projectId: 'speech-project', runGcloud: async () => ({ stdout: privateToken }),
      request: async () => { calls++; return new Response(privateToken, { status }); },
    });
    await assert.rejects(synthesize(requestBody), (error) => {
      assert.match(error.message, new RegExp(`HTTP ${status}`));
      assert.ok(!error.message.includes(privateToken));
      return true;
    });
    assert.equal(calls, 1);
  });
}

test('network failures and invalid API responses are sanitized', async () => {
  const base = { projectId: 'speech-project', runGcloud: async () => ({ stdout: privateToken }) };
  const disconnected = createGoogleSynthesizer({ ...base, request: async () => { throw new Error(privateToken); } });
  await assert.rejects(disconnected(requestBody), /not retried/);
  const invalidJson = createGoogleSynthesizer({ ...base, request: async () => new Response('not json') });
  await assert.rejects(invalidJson(requestBody), /invalid JSON/);
  for (const audioContent of ['', 'not base64!', 123, null]) {
    const invalidAudio = createGoogleSynthesizer({ ...base, request: async () => new Response(JSON.stringify({ audioContent })) });
    await assert.rejects(invalidAudio(requestBody), /invalid or empty audio/);
  }
});
