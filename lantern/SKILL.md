---
name: lantern
description: Build an animated, step-through technical explainer with Lantern.
disable-model-invocation: true
---

# Lantern explainer

Explain code, a plan, a design, an algorithm, or a bug through an animated scene.
Resolve bundled paths relative to this skill directory. For installation,
workspace creation, or preview setup, read [the setup guide](references/setup.md).

## 1. Understand

Inspect the sources. Choose the audience, the question to answer, and one concrete
example to trace. Support central claims with source references; label proposals
and assumptions.

## 2. Prepare

Use an existing Lantern workspace or create one:

```bash
bash <skill-dir>/scripts/lantern.sh setup
bash <skill-dir>/scripts/lantern.sh new <workspace-directory>
```

Use safely quoted absolute paths. The new destination must not exist. Author in
the workspace, leaving the shared installation unchanged.

Write `storyboard.md`: for each named step, list its idea, caption, visual change,
and supporting source. Record the source revision. Show causality through a
concrete example, keeping object identity and color meaning stable across steps.

## 3. Author

Read the workspace's `README.md`, `src/index.ts`, `scenes/index.ts`, and a relevant
example. Use these as the API reference.

Use TypeScript for custom motion, or `sceneFromDoc` for node/edge/state diagrams
after reading `docs/DOC-FORMAT.md`. Register the scene in `scenes/index.ts`.
Use stable step names, `meta.caption` for pacing and transcripts, and `this.state`
for the state being explained. Keep displayed values and trace state consistent.

## 4. Verify

Read `docs/VERIFY.md`. Check each step against the source or a reference
calculation; add a fidelity test for executable algorithmic claims.

Run from the workspace, substituting the scene key and step name:

```bash
npm run check
npm run see -- SCENE STEP
npm run verify:motion -- SCENE
npm run shot -- SCENE
npm run verify:layout -- SCENE
npm run verify:playback -- SCENE
npm test
```

Inspect every step's state diff and contact-sheet tile for correctness, clipping,
overlap, and readability. Preview playback and seeking. If a new scene needs a
golden trace, follow the upstream update procedure after reviewing its state;
confirm existing hashes are unchanged and rerun tests without the update flag.

## 5. Deliver

```bash
npm run build -- --only=SCENE
npm run --silent transcript -- SCENE > out/SCENE.md
npm run --silent transcript -- SCENE --vtt > out/SCENE.vtt
```

Return the HTML and editable workspace paths, assumptions, and any failed or
unavailable checks. Inspect the built HTML for unintended private source before
sharing. Keep delivery local unless hosting is requested.

Transcripts are not audio. When speech is requested, use a configured TTS tool
and verify timing against the steps.
