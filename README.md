# CB Skills

This repo holds the coding-agent skills I use on all my machines. It makes the
same skills available to Codex, Claude Code, and other agents that support the
`.agents` folder.

Skills from other repos are installed with the
[Skills CLI](https://github.com/vercel-labs/skills). The installed list is saved
in `skills-lock.json`. Skills maintained in this repo live in top-level folders
that contain a `SKILL.md` file.

## Set up

```bash
# 1. Download the skills listed in skills-lock.json:
npx --yes skills@latest experimental_install

# 2. Apply local skill policy and link skills for the agents on this machine:
./scripts/install.sh
```

The installer adds symlinks in:

- `~/.agents/skills`
- `~/.claude/skills`

It never replaces a real file or folder. It updates links it created and
removes its links to skills that are no longer in this repo.

Start a new agent session after adding a skill so the agent can find it.

## Add, update, or remove skills from other repos

Run these commands from this repo so they update `skills-lock.json`:

```bash
# Add one skill:
npx --yes skills@latest add <owner>/<repository> --skill <skill-name> --agent codex claude-code -y

# Update locked skills, reapply local policy, and refresh links:
./scripts/update.sh

# Remove one skill:
npx --yes skills@latest remove <skill-name> -y
```

After adding, removing, or restoring a skill, run `./scripts/install.sh` again.
Use `./scripts/update.sh` for updates: it runs the Skills CLI, reapplies policy,
and refreshes links. If you update through the CLI directly, rerun the installer
before using an agent. If you pull a change that removes skills from
`skills-lock.json`, run the project-scoped
`skills remove <skill-name> -y` for each removed skill to delete its downloaded
copy. The installer unlinks removed skills but does not delete downloaded files.

Include `--agent codex claude-code` when adding skills: Codex selects the shared
`.agents/skills` destination, and Claude Code gets a link to it. Selecting only
Claude Code can update `.claude/skills` while leaving the shared copy stale.

Review downloaded skills before using them. Commit the changed
`skills-lock.json`. Git ignores the downloaded files in `.agents/skills` and
the generated links in `.claude/skills`.

Use the commands above without `-g`. Global commands write into the same
folders managed by `install.sh` and can conflict with its links.

### Local skill policy

`skills-policy.json` records generated overrides for downloaded skills. Its
`manualOnly` list currently contains only Anatomy. `scripts/apply-skill-policy.mjs` sets
`disable-model-invocation: true` in their `SKILL.md` frontmatter and
`policy.allow_implicit_invocation: false` in `agents/openai.yaml`, creating that
metadata file if needed. Other metadata and upstream body text are preserved.

The installer calls this script before creating links. The update wrapper also
calls it after the Skills CLI returns, even on failure, because a partial update
may already have overwritten files. Repeated runs do not rewrite unchanged files.
Unexpected metadata layouts fail with an error instead of silently skipping the
policy. The script supports block-style YAML for these settings, not inline
policy mappings or aliases.

The patch script and policy are tracked; downloaded copies remain ignored. The
lockfile continues to describe upstream content, not our local overrides.
To remove an override, remove its policy entry, restore that skill's upstream
copy, and rerun the installer. Removing the entry alone does not undo an already
applied patch.

The `dependencyApproval` list covers our nine Emil UI skills. The same script
inserts a marked local guidance section after their frontmatter. It requires
explicit approval for a proposed new or replacement project dependency; a feature
request alone is not approval. Reusing installed libraries needs no additional
approval. It also places project conventions above the playbook, asks for the
smallest appropriate workflow, and requires honest reporting of visual checks.
These rules travel with the global skill links and are reapplied after updates.
They guide agent behavior; they are not a package-manager permission mechanism.

We install `animate`, `review-animations`, `improve-animations`,
`find-animation-opportunities`, `prototype`, `choreograph`, `pick-ui-library`,
`break-ui`, and `learn-taste` from Emil's collection. Their upstream invocation
defaults are unchanged: `review-animations`, `prototype`, `pick-ui-library`, and
`learn-taste` are manual-only. Cross-skill references can still direct an agent
to read a manual-only skill as reference material.

Invoke Anatomy explicitly with `/skill:anatomy` in Pi, `/anatomy` in Claude Code,
or `$anatomy` in Codex. Reload or start a new agent session after changing policy.

Run policy and installer/update tests without downloading updates:

```bash
node --test scripts/apply-skill-policy.test.mjs
```

### Check for new skills

The update command only knows about skills already listed in
`skills-lock.json`. It downloads changes to those skills and may ask to remove
one that disappeared. It does not add a new skill. If a skill was renamed, you
must add the new name yourself.

Git tags and release numbers do not change this behavior. The lock file tracks
each selected skill and its contents, not a version of the whole repo. It cannot
follow a rule such as "stay on compatible version 1 releases."

To see every skill currently offered by a source repo without installing
anything, run:

```bash
npx --yes skills@latest add <owner>/<repository> --list
```

Compare that list with `skills-lock.json`, then add any new or renamed skills
you want.

## Skills maintained in this repo

These skills live in top-level folders containing a `SKILL.md` file. Edit and
commit them like any other files. After adding or removing one, run
`./scripts/install.sh`.

### Clean up (manual only)

`clean-up` inventories and removes a task's disposable artifacts and temporary
processes, including resources outside the repository. It protects user-provided
files, shared resources, review deliverables, and unfinished work, then verifies
and reports what remains. Repository rules still govern branch/worktree removal;
the skill does not authorize merging or pushing.

Use `/skill:clean-up` in Pi, `/clean-up` in Claude Code, or `$clean-up` in Codex.
Optionally name the task or repository to clean. Run `./scripts/install.sh` after
adding it and reload or start a new agent session to discover it.

### Lantern technical explainers (manual only)

`lantern` creates animated, step-through explanations of code, plans,
architecture, algorithms, bugs, or diffs. It is excluded from automatic model
invocation. Use `/skill:lantern <topic>` in Pi, `/lantern <topic>` in Claude Code,
or `$lantern <topic>` in Codex.

After linking skills, install its pinned toolkit and optional Chromium checks:

```bash
bash lantern/scripts/lantern.sh setup
bash lantern/scripts/lantern.sh browser
```

The toolkit stays in the user's data directory, not in this repo. Create an
independent workspace with `bash lantern/scripts/lantern.sh new <new-directory>`.
See [portable setup and updates](lantern/references/setup.md) for prerequisites,
storage overrides, and verification. No dotfiles changes are required.

### Lantern Voice (manual only)

`lantern-voice` produces a complete English- or German-narrated explainer from a topic,
code, or plan. It uses Google Cloud TTS's `en-US-Chirp3-HD-Despina` voice.
Use `/skill:lantern-voice <topic>` in Pi, `/lantern-voice <topic>` in Claude Code,
or `$lantern-voice <topic>` in Codex.

```bash
node lantern-voice/scripts/voice.mjs setup
./scripts/install.sh
```

It shares the Lantern installer, not the `/lantern` skill workflow. Install
`gcloud` using [Google's CLI installer](https://docs.cloud.google.com/sdk/docs/install-sdk).
Then run `gcloud init --console-only` in your terminal to sign in and select the
Google Cloud project to use for speech. The skill uses that
normal CLI login; no private key or second login is needed. Login state and
cached audio stay machine-local. See
[setup, sign-in, and verification](lantern-voice/references/setup.md).
