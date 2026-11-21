import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, copyFile, chmod, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { manualFrontmatter, manualCodexPolicy, dependencyApprovalGuidance, applySkillPolicy } from './apply-skill-policy.mjs';

const source = '---\nname: anatomy\ndescription: Draw an instrument.\n---\n\n# Anatomy\n\nKeep the body unchanged.\n';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cb-skills-policy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = join(root, '.agents/skills/anatomy');
  await mkdir(skill, { recursive: true });
  await writeFile(join(skill, 'SKILL.md'), source);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: ['anatomy'] }));
  await writeFile(join(root, 'skills-lock.json'), JSON.stringify({ version: 1, skills: { anatomy: { source: 'upstream/anatomy', computedHash: 'original' } } }));
  return { root, skill };
}

test('frontmatter patch is idempotent and preserves the description, body, and CRLF', () => {
  const patched = manualFrontmatter(source);
  assert.ok(patched.includes('disable-model-invocation: true\n'));
  assert.equal(manualFrontmatter(patched), patched);
  assert.equal(patched.replace('disable-model-invocation: true\n', ''), source);
  const crlf = source.replaceAll('\n', '\r\n');
  assert.equal(manualFrontmatter(crlf).replace('disable-model-invocation: true\r\n', ''), crlf);
});

test('existing flags and their comments are preserved correctly', () => {
  const existing = source.replace('name: anatomy', '"disable-model-invocation": false # local preference\nname: anatomy');
  const patched = manualFrontmatter(existing);
  assert.ok(patched.includes('disable-model-invocation: true # local preference'));
  assert.equal(patched.match(/disable-model-invocation/g).length, 1);
});

test('Codex patch creates policy or changes only the target flag', () => {
  assert.equal(manualCodexPolicy(''), 'policy:\n  allow_implicit_invocation: false\n');
  const existing = 'interface:\n  display_name: "Anatomy"\npolicy:\n  other_setting: true\n  allow_implicit_invocation: true # retain comment\ndependencies:\n  tools: []\n';
  const patched = manualCodexPolicy(existing);
  assert.equal(patched, existing.replace('allow_implicit_invocation: true', 'allow_implicit_invocation: false'));
  assert.equal(manualCodexPolicy(patched), patched);
  assert.ok(manualCodexPolicy('policy:\n    other_setting: true\n').includes('    allow_implicit_invocation: false'));
});

test('unsupported or ambiguous metadata fails closed', () => {
  assert.throws(() => manualFrontmatter('no frontmatter'), /frontmatter/);
  assert.throws(() => manualFrontmatter(source.replace('name: anatomy', 'disable-model-invocation: false\ndisable-model-invocation: true')), /Duplicate/);
  assert.throws(() => manualFrontmatter(source.replace('name: anatomy', 'disable-model-invocation: perhaps')), /boolean/);
  assert.throws(() => manualCodexPolicy('policy: { allow_implicit_invocation: true }\n'), /block mapping/);
  assert.throws(() => manualCodexPolicy('policy:\n  allow_implicit_invocation: true\n  allow_implicit_invocation: false\n'), /Duplicate/);
  assert.throws(() => manualCodexPolicy('policy: *shared\n'), /block mapping/);
  assert.throws(() => manualCodexPolicy('---\ninterface: {}\n---\npolicy: {}\n'), /Multiple/);
});

test('policy patches only declared downloads, leaves the lock unchanged, and avoids repeat writes', async (t) => {
  const { root, skill } = await fixture(t);
  const lock = await readFile(join(root, 'skills-lock.json'), 'utf8');
  assert.deepEqual(await applySkillPolicy(root), { skills: 1, written: 2 });
  assert.deepEqual(await applySkillPolicy(root), { skills: 1, written: 0 });
  assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /disable-model-invocation: true/);
  assert.match(await readFile(join(skill, 'agents/openai.yaml'), 'utf8'), /allow_implicit_invocation: false/);
  assert.equal(await readFile(join(root, 'skills-lock.json'), 'utf8'), lock);
});

test('all targets validate before the first write', async (t) => {
  const { root, skill } = await fixture(t);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: ['anatomy', 'missing'] }));
  await writeFile(join(root, 'skills-lock.json'), JSON.stringify({ skills: { anatomy: {}, missing: {} } }));
  await assert.rejects(applySkillPolicy(root), /missing.*missing/);
  assert.equal(await readFile(join(skill, 'SKILL.md'), 'utf8'), source);
});

test('invalid names, unknown skills, and escaping symlinks are refused', async (t) => {
  const { root, skill } = await fixture(t);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: ['../other'] }));
  await assert.rejects(applySkillPolicy(root), /Invalid skill/);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: ['unknown'] }));
  await assert.rejects(applySkillPolicy(root), /not declared/);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: ['anatomy'] }));
  const outside = join(root, 'outside');
  await mkdir(outside);
  await symlink(outside, join(skill, 'agents'));
  await assert.rejects(applySkillPolicy(root), /outside/);
  assert.equal(await readFile(join(skill, 'SKILL.md'), 'utf8'), source);
});

test('dependency approval guidance preserves upstream content and invocation defaults', async (t) => {
  const { root, skill } = await fixture(t);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: [], dependencyApproval: ['anatomy'] }));
  assert.deepEqual(await applySkillPolicy(root), { skills: 1, written: 1 });
  const patched = await readFile(join(skill, 'SKILL.md'), 'utf8');
  assert.match(patched, /obtain explicit user approval for that dependency/);
  assert.ok(!patched.includes('disable-model-invocation'));
  assert.ok(patched.endsWith('\n\n# Anatomy\n\nKeep the body unchanged.\n'));
  assert.equal(dependencyApprovalGuidance(patched), patched);
  assert.deepEqual(await applySkillPolicy(root), { skills: 1, written: 0 });
  const manual = manualFrontmatter(source);
  assert.ok(dependencyApprovalGuidance(manual).includes('disable-model-invocation: true'));
  const crlf = source.replaceAll('\n', '\r\n');
  assert.equal(dependencyApprovalGuidance(crlf), dependencyApprovalGuidance(source).replaceAll('\n', '\r\n'));
  assert.throws(() => dependencyApprovalGuidance('no frontmatter'), /frontmatter/);
});

test('overlapping policies compose without duplicate writes', async (t) => {
  const { root, skill } = await fixture(t);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: ['anatomy'], dependencyApproval: ['anatomy'] }));
  assert.deepEqual(await applySkillPolicy(root), { skills: 1, written: 2 });
  const patched = await readFile(join(skill, 'SKILL.md'), 'utf8');
  assert.match(patched, /disable-model-invocation: true/);
  assert.match(patched, /obtain explicit user approval/);
  assert.deepEqual(await applySkillPolicy(root), { skills: 1, written: 0 });
});

test('dependency approval validates all targets before writing', async (t) => {
  const { root, skill } = await fixture(t);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: [], dependencyApproval: ['anatomy', 'unknown'] }));
  await assert.rejects(applySkillPolicy(root), /not declared/);
  assert.equal(await readFile(join(skill, 'SKILL.md'), 'utf8'), source);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: [], dependencyApproval: ['anatomy', 'anatomy'] }));
  await assert.rejects(applySkillPolicy(root), /Duplicate/);
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: [], dependencyApproval: true }));
  await assert.rejects(applySkillPolicy(root), /array/);
});

async function workflowFixture(t) {
  const result = await fixture(t);
  const { root } = result;
  await writeFile(join(root, 'skills-policy.json'), JSON.stringify({ manualOnly: ['anatomy'], dependencyApproval: ['anatomy'] }));
  await mkdir(join(root, 'scripts'));
  for (const name of ['apply-skill-policy.mjs', 'install.sh', 'update.sh']) {
    await copyFile(join(scriptDirectory, name), join(root, 'scripts', name));
  }
  const bin = join(root, 'test-bin');
  await mkdir(bin);
  const npx = join(bin, 'npx');
  await writeFile(npx, `#!/usr/bin/env bash
printf '%s\\n' "$*" > "$UPDATE_TEST_LOG"
printf '%s\\n' '---' 'name: anatomy' 'description: Updated upstream skill.' 'disable-model-invocation: false' '---' '# Updated body' > .agents/skills/anatomy/SKILL.md
exit "\${UPDATE_TEST_STATUS:-0}"
`);
  await chmod(npx, 0o755);
  return { ...result, env: { ...process.env, HOME: join(root, 'test-home'), PATH: `${bin}:${process.env.PATH}`, UPDATE_TEST_LOG: join(root, 'update.log') } };
}

test('install and update share the policy script and link only the patched download', async (t) => {
  const { root, skill, env } = await workflowFixture(t);
  const install = spawnSync('bash', [join(root, 'scripts/install.sh')], { env, encoding: 'utf8' });
  assert.equal(install.status, 0, install.stderr);
  const update = spawnSync('bash', [join(root, 'scripts/update.sh')], { env, encoding: 'utf8', cwd: tmpdir() });
  assert.equal(update.status, 0, update.stderr);
  assert.equal((await readFile(join(root, 'update.log'), 'utf8')).trim(), '--yes skills@latest update -p');
  assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /disable-model-invocation: true/);
  assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /obtain explicit user approval/);
  assert.equal(await readlink(join(env.HOME, '.agents/skills/anatomy')), skill);
  assert.equal(await readlink(join(env.HOME, '.claude/skills/anatomy')), skill);
});

test('failed updates still reapply policy and preserve the update failure status', async (t) => {
  const { root, skill, env } = await workflowFixture(t);
  const result = spawnSync('bash', [join(root, 'scripts/update.sh')], { env: { ...env, UPDATE_TEST_STATUS: '7' }, encoding: 'utf8' });
  assert.equal(result.status, 7, result.stderr);
  assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /disable-model-invocation: true/);
  assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /obtain explicit user approval/);
});
