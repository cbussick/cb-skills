# Setup and commands

This skill uses Google Cloud Text-to-Speech with English and German Chirp 3 HD voices.
It shares the adjacent
`lantern/scripts/lantern.sh` installer and its upstream pin; keep both directories
when syncing `cb-skills`.

## Install on a machine

Prerequisites: Bash, Git, tar, Node.js 24+, npm, and `gcloud`.
Install `gcloud` using
[Google's CLI installer](https://docs.cloud.google.com/sdk/docs/install-sdk).
From `cb-skills`:

```bash
node lantern-voice/scripts/voice.mjs setup
./scripts/install.sh
```

Setup checks that `gcloud` is installed and installs the pinned Lantern toolkit.
It does not sign in. Downloads, dependencies, and generated speech stay outside
Git. Speech is cached under
`${XDG_DATA_HOME:-$HOME/.local/share}/lantern-voice/audio/`.
There is no extra Google client-library dependency.

`LANTERN_VOICE_HOME` overrides the voice data directory; use an absolute path.
`LANTERN_HOME` controls the shared Lantern installation. The upstream toolkit
requires URL-safe paths without spaces; the shared installer checks them.

Keep credentials, cached speech, generated workspaces, and output out of the
config repo. Cached speech can contain private narration; remove its data
directory manually when no longer needed. Moving a workspace preserves its
source and output; copy the speech cache separately if offline rebuilding matters.

## Sign in once per machine

In your own terminal, run:

```bash
gcloud init --console-only
```

Follow Google's browser instructions and select the Google Cloud project to use
for speech. This configures the normal CLI login and project;
no separate application-default login or downloaded private key is needed.
The project must have Cloud Text-to-Speech enabled and billing configured.
Reusing a project does not require copying its production credentials.

Check the selected project with `gcloud config get-value project`. By default,
the helper uses that project for the request's quota/billing header. To keep
speech on a fixed project regardless of other CLI work, set the non-secret
`LANTERN_VOICE_GOOGLE_PROJECT` variable in your shell environment.
The helper only reads CLI settings; it never changes your account or project.

When missing speech needs generating, the helper captures
`gcloud auth print-access-token --quiet` internally and calls Google's speech
API. Tokens are not printed or stored by the helper. Normal builds with cached
audio and `plan` do not need a login. Missing/expired login is a blocker; ask the
user to sign in in their terminal rather than attempting an interactive login
or retrieving production secrets through the agent.

Login files remain machine-local, outside Git. An unrestricted agent running as
the same user can access that login and its permissions; this is not a security
sandbox. Do not paste credentials or login codes into chat. The finished player
has no credentials and makes no Google calls.

Usage is billed to the selected project, sharing its free allowance with other
applications. The free tier is not a spending cap; check pricing and use billing
alerts.

Official references:
[command-line TTS workflow](https://docs.cloud.google.com/text-to-speech/docs/create-audio-text-command-line),
[Chirp 3 HD](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd),
[pricing](https://cloud.google.com/text-to-speech/pricing).

## Create an explainer

```bash
node lantern-voice/scripts/voice.mjs new "$HOME/Documents/explainers/cache-design"
```

The destination must not exist. In that workspace, author e.g.
`scenes/cache-design.ts` with `export class CacheDesign extends Scene`.
Registration in `scenes/index.ts` is optional for narrated builds, but useful for
the upstream inspection tools. Use a kebab-case filename and stable step names.
Every step needs a caption, and captions must fit Google's 5,000-byte input limit.

```bash
node lantern-voice/scripts/voice.mjs plan "$HOME/Documents/explainers/cache-design" scenes/cache-design.ts CacheDesign
node lantern-voice/scripts/voice.mjs build "$HOME/Documents/explainers/cache-design" scenes/cache-design.ts CacheDesign --generate
```

English is the default. For a German explainer, write German captions and
on-screen explanations, then pass `--language de-DE` to both commands:

```bash
node lantern-voice/scripts/voice.mjs plan "$HOME/Documents/explainers/cache-design" scenes/cache-design.ts CacheDesign --language de-DE
node lantern-voice/scripts/voice.mjs build "$HOME/Documents/explainers/cache-design" scenes/cache-design.ts CacheDesign --language de-DE --generate
```

`--language en-US` explicitly selects English. The flag selects a voice, not
translation; captions are synthesized as written. Use the same flag on every
rebuild. Both languages share the existing Google login and project.

These commands import and run the scene as JavaScript; use trusted workspace code.
`plan` prints captions and byte counts without calling Google. `build --generate`
sends missing captions to Google; `build` without the flag fails if audio is not
cached. Requests are not retried automatically, avoiding duplicate generation on
ambiguous failures. Successful clips are cached by the complete synthesis request, including
voice and format. A corrupt cached file is reported rather than silently replaced.

## Timing and output

English uses `en-US-Chirp3-HD-Despina`; German uses `de-DE-Chirp3-HD-Achernar`.
Audio is **mono 24 kHz LINEAR16 WAV**. WAV gives exact sample-based durations
and lets the builder insert silence without FFmpeg or another decoder.

A scene wrapper extends each step to fit its clip plus a 0.2-second tail, rounded
up to a scene frame. Longer visual or caption-reading holds remain. Original
scene files and the shared toolkit are unchanged. Time-dependent scene logic can
change the story when steps are extended; use explicit state and operations.

Each clip starts at its step boundary. Extra step time becomes silence in a
single narration track. The player uses that track's media time as its clock,
so buffering pauses visual progression. Playback starts paused; click Play.
Seeking and step navigation also stay paused with a preview. Mute keeps the clock
running. Captions remain visible.

Outputs under `out/voice/<scene-name>/`:

- `index.html`: offline player with embedded audio; this file alone can be shared.
- `narration.wav`: the full track, for inspection or reuse.
- `manifest.json`: language, voice, clip hashes, durations, step state, and final timeline.
- `transcript.md`: narration in the chosen language with step timings.

WAV embedding produces larger HTML than compressed audio. Builds are limited to
30 minutes. The builder includes only the selected module and its imports, omits
the upstream guide, and makes no font/network requests. It adapts the pinned
player at build time and fails if the required hooks have changed; review this
integration when updating Lantern. Updates replace generated outputs, not source.

## Verification

For source scenes, use the upstream checks documented in the workspace. For the
narrated output, manually check intelligibility, timing, playback controls, and
layout. A synthetic-audio test is not proof of real speech quality.

Run the skill's unit checks from `cb-skills`:

```bash
node --test lantern-voice/tests/*.test.mjs
```

The browser integration test is skipped unless `LANTERN_TEST_WORKSPACE` points
to a disposable Lantern workspace. The test writes fixture scenes and output in
that workspace. Install Chromium through the shared Lantern helper; use its
existing setup guide for Ubuntu 26.04's compatibility override. Then run:

```bash
LANTERN_TEST_WORKSPACE=/absolute/disposable/workspace \
LANTERN_TEST_CHROMIUM=/absolute/path/to/chromium \
  node --test lantern-voice/tests/*.test.mjs
```

`LANTERN_TEST_CHROMIUM` is optional when the matching Playwright browser is already
installed and discoverable. Browser tests use synthetic tones, not Google, and
cover pause/resume, synchronization, seeking, step mode, mute, restart, and mobile
layout. The test also checks that unrelated scene code and external font requests
are absent. Live Google synthesis must be verified separately with credentials.

In Pi, `/reload`, then `/skill:lantern-voice <topic>`. In Claude Code use
`/lantern-voice`; in Codex use `$lantern-voice`. Invocation is manual-only.
