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
| febop-job-sheet | Landed | `340f6ee`, [PR #96](https://github.com/RB-ImConsult/febop-job-sheet/pull/96) | Main CI passed and published the new SHA-tagged and `latest` GHCR image |
| vokhanhbel | Landed | `fe0f04b`, [PR #62](https://github.com/cbussick/vokhanhbel/pull/62) | Required checks passed; Vercel Production deployment completed successfully |
| phoget | No change needed | No old glossary or old-name references on main | No release triggered |

The glossary migrations preserve domain definitions and do not change application behavior, version numbers or deployment configuration. Vokhanhbel also includes the separately user-approved grpc-js security patch described below. cb-skills retains the same skill selection: no additional Matt skills were installed or removed.

## Vokhanhbel blocker resolved

The initial [Quality run](https://github.com/cbussick/vokhanhbel/actions/runs/37235513439) failed at `npm audit --omit=dev --audit-level=high` for the pre-existing `@grpc/grpc-js@1.14.4` dependency:

- Dependency chain: `@google-cloud/text-to-speech@7.0.0` → `google-gax@6.1.0` → `@grpc/grpc-js`.
- High-severity advisories: [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) and [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4).
- After explicit user approval, commit `8a84cea` updated grpc-js to **1.14.5**. Only three lockfile fields changed: version, resolved URL and integrity. `package.json` and every other locked package are unchanged. The parent's existing `^1.12.6` range accepts the patch.
- The installed production audit now reports **zero vulnerabilities**. This does not claim all development-tool audit findings were remediated.
- Post-patch local formatting, lint, typecheck, all 258 unit tests, build and license checks passed. Registry metadata matched the new lock entry.
- The first post-patch hosted attempt hit the existing 15-second timeout in `scripts/localDevelopment.integration.test.ts`. An unchanged rerun passed every Quality step, including unit/database/browser tests, production audit and licenses. No assertions, timeouts, workflow gates or branch protections were weakened.
- [Successful hosted run, attempt 2](https://github.com/cbussick/vokhanhbel/actions/runs/37236581539/attempts/2).

PR #62 merged normally at `2026-10-04T21:41:10Z`, producing `fe0f04b1990b132ccbd38e8245c96f45b92cfad1`. Local main was fast-forwarded and the task worktree/branch removed. Vercel's **Production** deployment for that main commit completed successfully at `2026-10-04T21:42:09Z` (GitHub deployment `6847143443`; [deployment](https://vokhanhbel-5r55cmgfx-cbussicks-projects.vercel.app)).

## Job-sheet publication

[Main CI run 37235725881](https://github.com/RB-ImConsult/febop-job-sheet/actions/runs/37235725881) completed successfully. Its [publication job](https://github.com/RB-ImConsult/febop-job-sheet/actions/runs/37235725881/job/111535197636) successfully pushed:

- `ghcr.io/rb-imconsult/febop-job-sheet:340f6eec14847ffb549a13e6b3c0b5adab20a78e`
- `ghcr.io/rb-imconsult/febop-job-sheet:latest`

The complete main-branch quality pipeline and image publication both succeeded. No customer container was manually restarted by this task.

## Podcast-vault branch isolation

The original checkout was on `feature/personal-dashboard-v1`, with extensive application work not on main. Its existing glossary was renamed in local commit `89f9bcc`, without publishing or merging that feature branch.

The main integration was created separately from `origin/main`: only the glossary and domain guidance were added/updated. Both independent review axes flagged that the feature glossary could otherwise be mistaken for main's current behavior. The domain guide now explicitly identifies the pending Personal Dashboard model and preserves current-main README/security/configuration rules until that feature lands. Definitions were preserved; unrelated application history was not merged.

The primary podcast checkout remains on its existing feature branch intentionally. Its local `main` and remote `origin/main` contain the isolated documentation changes.

## Verification and review

### Standards

An isolated Pi reviewer found one issue: podcast's imported feature glossary needed scope guidance. Fixed and checked against the existing security instructions. No other actionable findings. A separate follow-up Standards review of Vokhanhbel's grpc-js patch found no issues.

### Spec

A separate isolated Pi reviewer independently found the same main-versus-feature isolation issue. Fixed with explicit pending-feature scope. No other actionable findings. A separate follow-up Spec review of the authorized grpc-js patch found no issues.

### Checks

- Every migrated glossary retained its definitions; all migrated main branches have updated naming references. Job-sheet only needed convention references updated because no root glossary existed.
- cb-skills: lock JSON parsed, installer shell syntax passed, global installer linked 40 skills, and all 22 still-existing Matt skills matched v1.3.1 during the audit. Literal `.diff` evidence contains valid blank context lines; source/document whitespace checks excluded those patch artifacts.
- Podcast main patch: 31 tests and typecheck passed.
- Input-monitor: complete local pipeline passed, including 35 tests, production image, isolated migrations, readiness and revision checks. PR and post-merge CI passed.
- Monorepo: PR and post-merge verification passed, including image builds; staging publication skipped.
- XR: changed-document formatting, both PR checks and post-merge CI passed. No learner workspace or server was touched.
- Job-sheet: local formatting/lints/typecheck passed; serial rerun passed 63 tests (30 database-dependent tests skipped under the existing local configuration) and the build. All PR CI gates passed, including integration, audit, production-image and Chromium/WebKit browser tests.
- Vokhanhbel: post-patch local checks passed, including 258 tests, build, licenses and a clean production audit. The complete hosted Quality gate passed on the unchanged retry; details are above.
- Initial concurrent local job-sheet and Vokhanhbel runs each hit a router timeout. Serial reruns passed without code, timeout or assertion changes. Those initial failures were disclosed in the PRs.

All merged task worktrees/branches were cleaned up after verifying main contained their changes, including Vokhanhbel's previously blocked worktree. The task-owned input-monitor CI image was removed after successful verification. No runtime was manually restarted; Vokhanhbel's production deployment and job-sheet's image publication were triggered by their existing merge workflows.
