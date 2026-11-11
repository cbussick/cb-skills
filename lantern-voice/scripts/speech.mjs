import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const voices = {
  'en-US': { name: 'en-US-Chirp3-HD-Despina', label: 'English', htmlLang: 'en', speaker: 'Despina' },
  'de-DE': { name: 'de-DE-Chirp3-HD-Achernar', label: 'German', htmlLang: 'de', speaker: 'Achernar' },
};
export function getVoice(language = 'en-US') {
  if (!Object.hasOwn(voices, language)) throw new Error('Unsupported language. Use en-US or de-DE.');
  return voices[language];
}
export const voiceName = getVoice().name;
export const sampleRate = 24000;
const bytesPerSample = 2;
const maxInputBytes = 5000;

export function speechRequest(text, language = 'en-US') {
  const voice = getVoice(language);
  if (typeof text !== 'string' || !text.trim()) throw new Error('Every step needs a caption.');
  if (Buffer.byteLength(text, 'utf8') > maxInputBytes) throw new Error('Caption exceeds 5,000 UTF-8 bytes. Split the step.');

  return {
    input: { text },
    voice: { languageCode: language, name: voice.name },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: sampleRate },
  };
}

export function readWav(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Expected a WAV file from Google LINEAR16 synthesis.');
  }

  let format;
  let pcm;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) throw new Error('Truncated WAV data.');
    if (id === 'fmt ' && size >= 16) {
      format = {
        encoding: buffer.readUInt16LE(start), channels: buffer.readUInt16LE(start + 2),
        rate: buffer.readUInt32LE(start + 4), bits: buffer.readUInt16LE(start + 14),
      };
    }
    if (id === 'data') pcm = buffer.subarray(start, start + size);
    offset = start + size + (size % 2);
  }

  if (!format || format.encoding !== 1 || format.channels !== 1 || format.rate !== sampleRate || format.bits !== 16) {
    throw new Error('Expected mono 24 kHz, 16-bit PCM audio.');
  }
  if (!pcm?.length || pcm.length % bytesPerSample) throw new Error('Invalid or empty PCM data.');

  return { pcm, duration: pcm.length / bytesPerSample / sampleRate };
}

export function writeWav(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * bytesPerSample, 28);
  header.writeUInt16LE(bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

export async function prepareClips(steps, cacheDirectory, synthesize, language = 'en-US') {
  getVoice(language);
  // Validate all requests before incurring any usage charges.
  const requests = steps.map((step) => speechRequest(step.meta?.caption, language));
  await mkdir(cacheDirectory, { recursive: true, mode: 0o700 });
  const clips = [];

  for (let index = 0; index < steps.length; index++) {
    const request = requests[index];
    const hash = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const path = join(cacheDirectory, `${hash}.wav`);
    let bytes;
    try {
      bytes = await readFile(path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!synthesize) throw new Error(`Missing narration for "${steps[index].step}". Sign in with gcloud and use --generate.`);
      bytes = Buffer.from(await synthesize(request));
      readWav(bytes);
      const temporary = `${path}.${process.pid}.tmp`;
      await writeFile(temporary, bytes, { mode: 0o600 });
      await rename(temporary, path);
    }

    clips.push({ step: steps[index].step, hash, ...readWav(bytes) });
  }

  return clips;
}

export function assembleNarration(trace, clips) {
  // Bound memory use for accidental runaway scenes (30 minutes of mono PCM).
  if (!Number.isFinite(trace.duration) || trace.duration <= 0 || trace.duration > 1800) {
    throw new Error('Narrated scene duration must be between zero and 30 minutes.');
  }
  const pcm = Buffer.alloc(Math.ceil(trace.duration * sampleRate) * bytesPerSample);

  for (const step of trace.steps) {
    const clip = clips.find((item) => item.step === step.step);
    if (!clip) throw new Error(`Missing clip for step ${step.step}.`);
    const offset = Math.round(step.t0 * sampleRate) * bytesPerSample;
    const end = offset + clip.pcm.length;
    const boundary = Math.round(step.t1 * sampleRate) * bytesPerSample;
    if (end > boundary || end > pcm.length) throw new Error(`Narration exceeds step ${step.step}.`);
    clip.pcm.copy(pcm, offset);
  }

  return writeWav(pcm);
}
