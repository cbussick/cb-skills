#!/usr/bin/env node
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, dirname, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const invocationKey = /^(?:disable-model-invocation|"disable-model-invocation"|'disable-model-invocation')\s*:/;
const policyKey = /^(?:policy|"policy"|'policy')\s*:/;
const implicitKey = /^(?:allow_implicit_invocation|"allow_implicit_invocation"|'allow_implicit_invocation')\s*:/;
const newlineOf = (text) => text.includes('\r\n') ? '\r\n' : '\n';
const fail = (message) => { throw new Error(`Skill policy: ${message}`); };

function setBoolean(line, key, value) {
  const content = line.slice(line.indexOf(':') + 1).trim();
  if (!/^(true|false)(\s+#.*)?$/i.test(content)) fail(`Expected a boolean for ${key}; review the upstream YAML.`);
  const comment = line.match(/\s+#.*$/)?.[0] ?? '';
  return `${line.match(/^ */)[0]}${key}: ${value}${comment}`;
}

// Targeted edits preserve the upstream document, comments, and body verbatim.
// Unsupported layouts fail closed rather than guessing at YAML semantics.
export function manualFrontmatter(text) {
  const newline = newlineOf(text);
  const lines = text.split(newline);
  const end = lines.findIndex((line, index) => index > 0 && line === '---');
  if (lines[0] !== '---' || end < 0) fail('SKILL.md must start with YAML frontmatter.');
  const matches = lines.slice(1, end).flatMap((line, index) => invocationKey.test(line) ? [index + 1] : []);
  if (matches.length > 1) fail('Duplicate disable-model-invocation fields.');
  if (matches.length) lines[matches[0]] = setBoolean(lines[matches[0]], 'disable-model-invocation', true);
  else lines.splice(1, 0, 'disable-model-invocation: true');

  return lines.join(newline);
}

export function manualCodexPolicy(text) {
  const newline = newlineOf(text);
  const lines = text.split(newline);
  if (lines.some((line) => /^\.\.\.\s*(#.*)?$/.test(line)) || lines.filter((line) => line === '---').length > 1) {
    fail('Multiple YAML documents are not supported in openai.yaml.');
  }
  const matches = lines.flatMap((line, index) => policyKey.test(line) ? [index] : []);
  if (matches.length > 1) fail('Duplicate policy mappings in openai.yaml.');
  if (!matches.length) {
    const prefix = text ? text + (text.endsWith(newline) ? '' : newline) : '';
    return `${prefix}policy:${newline}  allow_implicit_invocation: false${newline}`;
  }

  const start = matches[0];
  if (!/^\s*(#.*)?$/.test(lines[start].slice(lines[start].indexOf(':') + 1))) {
    fail('openai.yaml policy must be a block mapping; review the upstream YAML.');
  }
  let end = start + 1;
  while (end < lines.length && (/^\s*(#.*)?$/.test(lines[end]) || /^ +/.test(lines[end]))) end++;
  const children = lines.slice(start + 1, end).filter((line) => !/^\s*(#.*)?$/.test(line));
  if (children.some((line) => /^ *\t/.test(line) || !/^ +[^\s:#][^:]*:/.test(line))) {
    fail('Unsupported policy mapping layout; review the upstream YAML.');
  }
  const indentation = children.length ? Math.min(...children.map((line) => line.match(/^ */)[0].length)) : 2;
  const flags = lines.slice(start + 1, end).flatMap((line, offset) => {
    const indent = line.match(/^ */)[0].length;
    return indent === indentation && implicitKey.test(line.trimStart()) ? [start + 1 + offset] : [];
  });
  if (flags.length > 1) fail('Duplicate allow_implicit_invocation fields.');
  if (flags.length) lines[flags[0]] = setBoolean(lines[flags[0]], 'allow_implicit_invocation', false);
  else lines.splice(start + 1, 0, `${' '.repeat(indentation)}allow_implicit_invocation: false`);

  return lines.join(newline);
}

// Generated local guidance travels with the skill without changing invocation flags.
export function dependencyApprovalGuidance(text) {
  const newline = newlineOf(text);
  const lines = text.split(newline);
  const end = lines.findIndex((line, index) => index > 0 && line === '---');
  if (lines[0] !== '---' || end < 0) fail('SKILL.md must start with YAML frontmatter.');
  const marker = '<!-- cb-skills:dependency-approval -->';
  if (text.includes(marker)) return text;
  lines.splice(end + 1, 0, '', marker,
    '## Local UI workflow policy', '',
    'Use this playbook as guidance within the project’s conventions. Choose the smallest workflow that fits the task, and verify the rendered result when tools permit; disclose checks you could not run.', '',
    'Before adding or replacing a project dependency, explain the proposed library and why it is needed, then obtain explicit user approval for that dependency. A request to build a UI feature alone is not dependency approval. Reusing an already installed library needs no additional approval.',
    '<!-- /cb-skills:dependency-approval -->');
  return lines.join(newline);
}

async function assertContained(path, root) {
  let actual;
  try {
    actual = await realpath(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return assertContained(dirname(path), root);
  }
  const location = relative(root, actual);
  if (location === '..' || location.startsWith(`..${sep}`) || isAbsolute(location)) {
    fail(`Refusing a policy target outside the downloaded skill: ${path}`);
  }
}

export async function applySkillPolicy(repoRoot) {
  const policy = JSON.parse(await readFile(join(repoRoot, 'skills-policy.json'), 'utf8'));
  if (!policy || Object.keys(policy).some((key) => !['manualOnly', 'dependencyApproval'].includes(key)) || !Array.isArray(policy.manualOnly) || (policy.dependencyApproval !== undefined && !Array.isArray(policy.dependencyApproval))) {
    fail('skills-policy.json must contain a manualOnly array and an optional dependencyApproval array.');
  }
  const dependencyApproval = policy.dependencyApproval ?? [];
  for (const [key, names] of Object.entries({ manualOnly: policy.manualOnly, dependencyApproval })) {
    if (new Set(names).size !== names.length) fail(`Duplicate names in ${key}.`);
  }
  const lock = JSON.parse(await readFile(join(repoRoot, 'skills-lock.json'), 'utf8'));
  const managedRoot = await realpath(join(repoRoot, '.agents/skills'));
  const changes = [];

  const names = [...new Set([...policy.manualOnly, ...dependencyApproval])];
  for (const name of names) {
    if (typeof name !== 'string' || name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) fail('Invalid skill name in policy.');
    if (!Object.hasOwn(lock.skills, name)) fail(`${name} is not declared in skills-lock.json.`);
    const skillRoot = join(managedRoot, name);
    const skillPath = join(skillRoot, 'SKILL.md');
    await assertContained(skillPath, managedRoot);
    let original;
    try { original = await readFile(skillPath, 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      fail(`${name} is missing. Restore locked skills before applying policy.`);
    }
    let patched = policy.manualOnly.includes(name) ? manualFrontmatter(original) : original;
    if (dependencyApproval.includes(name)) patched = dependencyApprovalGuidance(patched);
    changes.push({ path: skillPath, before: original, after: patched });

    if (!policy.manualOnly.includes(name)) continue;
    const codexPath = join(skillRoot, 'agents/openai.yaml');
    await assertContained(codexPath, await realpath(skillRoot));
    let codex = '';
    try { codex = await readFile(codexPath, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    changes.push({ path: codexPath, before: codex, after: manualCodexPolicy(codex) });
  }

  // Validate every target before writing any file or letting the installer link it.
  let written = 0;
  for (const change of changes) {
    if (change.before === change.after) continue;
    await mkdir(dirname(change.path), { recursive: true });
    await writeFile(change.path, change.after);
    written++;
  }

  return { skills: names.length, written };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  applySkillPolicy(repoRoot).then(({ skills, written }) => {
    console.log(`Applied local policy to ${skills} skill(s); ${written} file(s) changed.`);
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
