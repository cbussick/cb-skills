import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runCommand = promisify(execFile);
const speechEndpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const commandOptions = { encoding: 'utf8', timeout: 30000, maxBuffer: 65536 };

export function createGoogleSynthesizer({ projectId = process.env.LANTERN_VOICE_GOOGLE_PROJECT, runGcloud = runCommand, request = fetch } = {}) {
  let selectedProject = projectId;

  async function gcloud(args, failureMessage) {
    try {
      const { stdout } = await runGcloud('gcloud', args, commandOptions);
      return stdout.trim();
    } catch {
      // Child-process errors can include stdout. Never propagate a token or CLI stderr.
      throw new Error(failureMessage);
    }
  }

  return async (speechRequest) => {
    if (!selectedProject) {
      selectedProject = await gcloud(['config', 'get-value', 'project', '--quiet'],
        'Could not read the Google project. Install gcloud and select a project, or set LANTERN_VOICE_GOOGLE_PROJECT.');
    }
    if (typeof selectedProject !== 'string' || !/^[a-z0-9][a-z0-9.:-]{0,127}$/.test(selectedProject)) {
      throw new Error('Select a Google project with gcloud config set project PROJECT_ID, or set LANTERN_VOICE_GOOGLE_PROJECT.');
    }

    const token = await gcloud(['auth', 'print-access-token', '--quiet'],
      'Could not use the gcloud login. Install gcloud if needed, then run gcloud auth login --no-launch-browser in your terminal.');
    if (!token || /\s/.test(token)) throw new Error('gcloud returned an invalid access token. Sign in again in your terminal.');

    let response;
    try {
      response = await request(speechEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-goog-user-project': selectedProject,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(speechRequest),
        signal: AbortSignal.timeout(60000),
        redirect: 'error',
      });
    } catch {
      throw new Error('Google TTS request failed or timed out. It was not retried; check connectivity before generating again.');
    }

    if (!response.ok) {
      const hints = {
        401: 'Sign in again with gcloud auth login.',
        403: 'Check the selected project, Text-to-Speech API access, billing, and permissions.',
        429: 'Check the project quota and rate limits.',
      };
      throw new Error(`Google TTS returned HTTP ${response.status}. ${hints[response.status] ?? 'Check service availability and request settings.'}`);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('Google TTS returned invalid JSON.');
    }
    const content = result?.audioContent;
    if (typeof content !== 'string' || !content.length || !/^[A-Za-z0-9+/]+={0,2}$/.test(content) || content.length % 4 !== 0) {
      throw new Error('Google TTS returned invalid or empty audio.');
    }

    return Buffer.from(content, 'base64');
  };
}
