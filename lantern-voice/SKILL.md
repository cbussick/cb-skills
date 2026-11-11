---
name: lantern-voice
description: Build an English- or German-narrated animated technical explainer with Lantern and Google TTS.
disable-model-invocation: true
---

# Lantern Voice

Produce a narrated explainer from a topic, code, a plan, a design, or a bug.
Use the user's requested language for narration and on-screen explanation;
English is the default. Google Cloud Text-to-Speech uses `en-US-Chirp3-HD-Despina`
for English and `de-DE-Chirp3-HD-Achernar` for German. For German explainers,
pass `--language de-DE` to both `plan` and `build`; otherwise the CLI uses English.
Language selection chooses the voice; author captions in that language.

Resolve bundled paths relative to this skill directory. Read
[setup and commands](references/setup.md) before installation, sign-in setup,
or browser verification. This is an end-to-end workflow; begin with the supplied
sources, not an existing animation.

## 1. Understand and storyboard

Choose the audience, the question to answer, and one concrete example to trace.
Support central claims with source references; label proposals and assumptions.

Create a workspace with the bundled CLI's `new` command, or use one designated
by the user. Write `storyboard.md` with the chosen language and each step's idea, narration,
visual change, and supporting source. Record the Lantern revision. Show causality
while keeping object identity and color meaning stable.

## 2. Author

Read the workspace's `README.md`, `src/index.ts`, and a relevant example. Use a
TypeScript module with a named scene-class export. Begin at time zero with a
named step; give every step a unique kebab-case name and a `meta.caption` in the chosen language.
Captions are the narration's source of truth. Keep `this.state` consistent with
the visuals, and scene logic independent of elapsed time.

Inspect captions without calling Google:

```bash
node <skill-dir>/scripts/voice.mjs plan <workspace> scenes/explainer.ts ExplainerScene
```

## 3. Narrate and build

```bash
node <skill-dir>/scripts/voice.mjs build <workspace> scenes/explainer.ts ExplainerScene --generate
```

`--generate` permits sending missing captions to Google and incurring usage.
It uses the user's normal `gcloud` login. If sign-in is needed, ask the user to
complete it in their terminal. Unchanged clips are cached. The builder measures speech, extends short steps,
and packages a single HTML file with embedded audio and synchronized controls.
Without `--generate`, it uses cached clips only.

Listen to the result. Adjust captions or animation beats when pronunciation or
pacing obscures the explanation, then rebuild. Timing keeps audio inside its
step; the author still aligns visual events with the words being spoken.

## 4. Verify and deliver

Check claims against the source or a reference calculation. Follow the workspace's
`docs/VERIFY.md` for source-scene checks. Open the narrated artifact and test play,
pause, seeking, step mode, mute, and restart. Inspect all steps at desktop and
mobile widths. Check `manifest.json` for measured clip and step durations.

Return `out/voice/<scene-name>/index.html` and the editable workspace path, with
assumptions and failed or unavailable checks. The output includes only the chosen
scene module and its imports; inspect those for private source before sharing.
Keep delivery local unless hosting is requested.
