# Portable setup

The skill and its pinned upstream revision live in `cb-skills/lantern`. Source,
`node_modules`, browsers, and generated explainers stay outside the config repo.
No dotfiles change, global npm package, or shell alias is needed.

## New machine

1. Clone/sync `cb-skills` and restore/link its skills using the root README.
2. Install Git, Bash, tar, and Node.js 24+ with npm using the machine's normal
   package manager. The helper checks these prerequisites; it does not change
   the machine's Node version.
3. From the `cb-skills` checkout:

   ```bash
   bash lantern/scripts/lantern.sh setup
   bash lantern/scripts/lantern.sh browser
   ```

`setup` clones `https://github.com/ivarvong/lantern`, checks out the exact commit
in `upstream-revision`, and runs `npm ci`. Its stdout is the source path; install
progress goes to stderr. Repeating setup reinstalls the same locked dependencies
and preserves local changes by refusing a dirty source checkout. npm may run
upstream dependency install scripts; use the machine's existing approval policy.

The default source path is:

```text
${XDG_DATA_HOME:-$HOME/.local/share}/lantern/<revision>
```

Set `LANTERN_HOME` to an absolute directory to override the base. These variables
are optional machine-local settings, not paths to hard-code in the skill.
The helper targets Linux, macOS, and WSL with Bash; only Linux was tested during
initial setup. Native Windows is not supported. Use URL-safe ASCII paths without
spaces, `%`, `#`, or `?` for source and workspaces. The pinned upstream build tools
use URL paths without decoding them; the helper rejects affected paths before
creating a workspace. If the home path contains spaces, set `LANTERN_HOME` to a
suitable absolute path.

## Create and use an explainer

```bash
bash lantern/scripts/lantern.sh new "$HOME/Documents/explainers/cache-design"
cd "$HOME/Documents/explainers/cache-design"
npm run build
```

Run the helper from the skill checkout or use its absolute path. `new` copies
only the pinned committed files, then installs that workspace's own dependencies.
It refuses every existing destination, including an empty directory or symlink.
A failed workspace dependency install leaves files in place for inspection;
fix the cause and run `npm ci` inside that workspace. It does not initialize a
Git repo; version the workspace in the user's chosen project if requested.

Use `bash lantern/scripts/lantern.sh path` to locate the installed upstream
source. Author in workspaces, not this shared source. Each workspace is
independent and can be moved: run `npm ci` there on the destination machine.
HTML built under `out/` is viewable without Node. The player may request Google
Fonts for its UI; the scene glyphs are embedded. Its guide includes links to
upstream hosted APIs, which do not know about locally authored scenes.

For a loopback-only preview of built HTML, from the workspace:

```bash
python3 -m http.server 5173 --bind 127.0.0.1 --directory out
```

Python is optional; any static server with an explicit loopback binding works.
The upstream dev server has live reload but binds on all interfaces, so use it
only when that exposure is intended. A server on this remote machine is not
automatically accessible in the user's local browser. Use the existing approved
tunnel/preview workflow if a remote URL is requested.

## Chromium and verification

`browser` runs the pinned installation's `playwright-core install chromium` with
browser garbage collection disabled, preserving other projects' cached browsers.
It uses Playwright's normal per-user browser cache, or `PLAYWRIGHT_BROWSERS_PATH`
when explicitly set. It downloads a browser but does not install OS packages.
If Chromium reports missing system libraries, install only its reported
prerequisites through the machine's normal package manager.

The pinned Playwright version does not recognize Ubuntu 26.04. On Ubuntu 26.04
x64, install its Ubuntu 24.04 build explicitly (tested on the initial machine):

```bash
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 \
  bash lantern/scripts/lantern.sh browser
```

This is a per-command compatibility override, not an OS-support guarantee or a
global setting. Verify the actual browser checks afterward. For another OS or
architecture, use a supported build for that system rather than copying this
x64 override. Normal installation remains the default on supported systems.

The upstream tools use their shared `tools/lib/browser.ts` launcher. If another
Chromium revision is already cached, the launcher can fall back to the version
expected by the pinned Playwright package; installing through `browser` ensures
that matching version exists. Do not substitute an arbitrary browser binary or
change global browser settings merely to silence a check.

## Explicit invocation

The skill sets `disable-model-invocation: true` for Pi and Claude Code.
`agents/openai.yaml` also sets `policy.allow_implicit_invocation: false` for
Codex. In Pi, reload skills with `/reload`, then use:

```text
/skill:lantern explain how this cache invalidation design works
```

In Claude Code, use `/lantern`; in Codex, use `$lantern`. Other agents must
support an explicit-only policy; verify their settings before enabling the skill
there. Codex's policy is documented in the official
[openai.yaml reference](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/references/openai_yaml.md).

## Update deliberately

Edit `lantern/upstream-revision` to a reviewed full commit SHA. Run setup and
browser installation again, then test `npm run check`, `npm test`, a scene build,
and the scene's motion, contact-sheet, layout, and playback checks in a fresh
workspace. Review changed authoring APIs and update this skill if needed. Commit
the new pin and any skill changes together. Old revision directories and existing
workspaces are retained; remove them manually only after preserving needed work.
