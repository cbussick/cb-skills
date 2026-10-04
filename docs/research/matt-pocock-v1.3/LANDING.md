# Main-branch integration status

2026-10-04 follow-up to the [initial audit](README.md). The user authorized landing the migrations and cb-skills changes on `main`, and asked which integrations trigger releases.

## Results

| Repository | Main status | Commit / PR | Release effect |
| --- | --- | --- | --- |
| cb-skills | Landed | `18538ff` | No automatic release |
| cb-podcast-vault | Landed | `e762745` | No automatic release |
| FeBOp-monorepo | Landed | `55446b3`, [PR #109](https://github.com/RB-ImConsult/FeBOp-monorepo/pull/109) | Verification passed; staging publication skipped because `version.txt` did not change |
| FeBOp-input-monitor | Landed | `d0d2f4d`, [PR #8](https://github.com/RB-ImConsult/FeBOp-input-monitor/pull/8) | Verification only; no automatic image publication |
| xr-learning-app | Landed | `c5f3945`, [PR #1](https://github.com/cbussick/xr-learning-app/pull/1) | Verification only; no app restart or learning-material publication |
| febop-job-sheet | Landed | `340f6ee`, [PR #96](https://github.com/RB-ImConsult/febop-job-sheet/pull/96) | Main CI triggers a new GHCR image publication after all checks pass |
| vokhanhbel | **Blocked, not merged** | [PR #62](https://github.com/cbussick/vokhanhbel/pull/62), branch `docs/glossary-v13` | Vercel preview succeeded; production deployment has **not** been triggered by this PR |
| phoget | No change needed | No old glossary or old-name references on main | No release triggered |

No application behavior, version number, dependency or deployment configuration was changed by the glossary migrations. cb-skills retains the same skill selection: no additional Matt skills were installed or removed.

## Vokhanhbel blocker

The required [Quality run](https://github.com/cbussick/vokhanhbel/actions/runs/37235513439) failed at `npm audit --omit=dev --audit-level=high`:

- Installed production dependency: `@grpc/grpc-js@1.14.4`.
- Dependency chain: `@google-cloud/text-to-speech@7.0.0` → `google-gax@6.1.0` → `@grpc/grpc-js@1.14.4`.
- High-severity advisories: [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) and [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4).
- `package.json` and `package-lock.json` are unchanged against main: this is a pre-existing dependency issue, not a migration regression.
- Formatting, lint, typecheck, unit tests, database tests, build and E2E passed in hosted CI. The license step was skipped after audit failure.

No dependency changes or branch-protection bypass were attempted. The remaining worktree is `/root/cb-coding/vokhanhbel/.worktrees/glossary-v13`. A dependency remediation needs approval and re-verification before this PR can land normally. When it does land, Vercel automatically deploys main to production.

## Job-sheet publication

The merge starts [main CI run 37235725881](https://github.com/RB-ImConsult/febop-job-sheet/actions/runs/37235725881). Its publication job pushes:

- `ghcr.io/rb-imconsult/febop-job-sheet:340f6eec14847ffb549a13e6b3c0b5adab20a78e`
- `ghcr.io/rb-imconsult/febop-job-sheet:latest`

Publication is gated on the complete main-branch quality pipeline. A triggered workflow is not proof publication has finished. No customer container was manually restarted by this task.

## Podcast-vault branch isolation

The original checkout was on `feature/personal-dashboard-v1`, with extensive application work not on main. Its existing glossary was renamed in local commit `89f9bcc`, without publishing or merging that feature branch.

The main integration was created separately from `origin/main`: only the glossary and domain guidance were added/updated. Both independent review axes flagged that the feature glossary could otherwise be mistaken for main's current behavior. The domain guide now explicitly identifies the pending Personal Dashboard model and preserves current-main README/security/configuration rules until that feature lands. Definitions were preserved; unrelated application history was not merged.

The primary podcast checkout remains on its existing feature branch intentionally. Its local `main` and remote `origin/main` contain the isolated documentation changes.

## Verification and review

### Standards

An isolated Pi reviewer found one issue: podcast's imported feature glossary needed scope guidance. Fixed and checked against the existing security instructions. No other actionable findings.

### Spec

A separate isolated Pi reviewer independently found the same main-versus-feature isolation issue. Fixed with explicit pending-feature scope. No other actionable findings.

### Checks

- Every migrated glossary retained its definitions; all migrated main branches have updated naming references. Job-sheet only needed convention references updated because no root glossary existed.
- cb-skills: lock JSON parsed, installer shell syntax passed, global installer linked 40 skills, and all 22 still-existing Matt skills matched v1.3.1 during the audit. Literal `.diff` evidence contains valid blank context lines; source/document whitespace checks excluded those patch artifacts.
- Podcast main patch: 31 tests and typecheck passed.
- Input-monitor: complete local pipeline passed, including 35 tests, production image, isolated migrations, readiness and revision checks. PR and post-merge CI passed.
- Monorepo: PR and post-merge verification passed, including image builds; staging publication skipped.
- XR: changed-document formatting, both PR checks and post-merge CI passed. No learner workspace or server was touched.
- Job-sheet: local formatting/lints/typecheck passed; serial rerun passed 63 tests (30 database-dependent tests skipped under the existing local configuration) and the build. All PR CI gates passed, including integration, audit, production-image and Chromium/WebKit browser tests.
- Vokhanhbel: local formatting/lint/typecheck passed; serial rerun passed 258 tests and build. Hosted results and the remaining audit blocker are detailed above.
- Initial concurrent local job-sheet and Vokhanhbel runs each hit a router timeout. Serial reruns passed without code, timeout or assertion changes. Those initial failures were disclosed in the PRs.

Merged task worktrees/branches were cleaned up after verifying main contained their changes. Vokhanhbel's blocked worktree and branch were retained. The task-owned input-monitor CI image was removed after successful verification; production runtimes were not altered.
