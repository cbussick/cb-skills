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

# 2. Make every skill available to the agents on this machine:
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
npx --yes skills@latest add <owner>/<repository> --skill <skill-name> -y

# Update the skills already listed in skills-lock.json:
npx --yes skills@latest update -p

# Remove one skill:
npx --yes skills@latest remove <skill-name> -y
```

After adding or removing a skill, run `./scripts/install.sh` again. You do not
need to run it after an update because the existing links still work.

Review downloaded skills before using them. Commit the changed
`skills-lock.json`. Git ignores the downloaded files in `.agents/skills` and
the generated links in `.claude/skills`.

Use the commands above without `-g`. Global commands write into the same
folders managed by `install.sh` and can conflict with its links.

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
