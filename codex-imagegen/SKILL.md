---
name: codex-imagegen
description: Generate images using Codex. Use when asked to generate an image, including requests to use Codex for image generation.
---

# Codex image generation

Delegate to the installed Codex CLI's native image-generation tool, then open the
saved image in the calling agent.

## Generate and inspect

1. Check `codex exec --help` for the installed CLI's options. If Codex is missing
   or unauthenticated, report the blocker.
2. Create a task-owned temporary directory with `mktemp -d`. Run Codex there,
   outside the project checkout, with workspace-write sandboxing:

   ```bash
   image_dir=$(mktemp -d "${TMPDIR:-/tmp}/codex-imagegen.XXXXXX")
   codex exec -C "$image_dir" --skip-git-repo-check -s workspace-write \
     --color never -o "$image_dir/result.txt" \
     'Use your native image-generation tool to generate: <user request>.
   Save the generated image in this working directory and report its absolute path.
   Use native image generation, not drawing code, SVG, or web images.
   If unavailable, report that instead of using a fallback.
   Do not modify project files.' </dev/null
   ```

   Replace the placeholder with the user's request, preserving their constraints.
   Pass the prompt as a safely quoted argument or through stdin; treat user text
   as data, not shell syntax. Allow several minutes for generation.
3. Read Codex's reported output and locate the actual image. Codex may generate
   under its own home directory before copying the image to the requested folder.
   Verify the file exists, then open it with the calling agent's image-reading
   tool. Check that it matches the request; report any mismatch or generation
   failure rather than claiming success.
4. If the user specified a destination, copy the verified image there, following
   that project's instructions and preserving existing files unless replacement
   was requested. Otherwise retain the temporary image. Report the final path.

## Optional tailnet preview

When the user asks for a tailnet URL:

1. Get this machine's IPv4 address with `tailscale ip -4`. Check listening ports
   and choose an unused port. If Tailscale is unavailable, report the blocker.
2. Put only the intended preview images in a task-owned serving directory.
   Start a static server bound to the tailnet IP, not all interfaces:

   ```bash
   nohup python3 -m http.server "$port" --bind "$tailnet_ip" \
     --directory "$preview_dir" >"$image_dir/http.log" 2>&1 </dev/null &
   server_pid=$!
   ```

3. Verify the image URL returns HTTP 200 with `curl --noproxy '*'`.
   Return `http://<tailnet-ip>:<port>/<image-filename>` and record the server PID
   for cleanup. Keep the server alive for viewing; stop only this task's process
   when the user asks to clean up.
