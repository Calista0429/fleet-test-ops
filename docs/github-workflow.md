# GitHub development evidence

This is a solo portfolio project. The repository contains real implementation milestones, tests, an approved design, and reviewable templates. It does not claim collaboration with other engineers or a human review that did not occur.

| Commit    | Result                                                            | Observed verification at that milestone                                     |
| --------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `7b518e1` | PostgreSQL model, guarded seed/reset, shared validation contracts | 42 contract/database tests; types, lint, repeated migration/seed            |
| `1f76334` | Parameterized read queries and persistent API mutations           | 72 tests; standalone HTTP readiness/dashboard/pagination                    |
| `e18c5a3` | React overview and vehicle history                                | 82 tests; desktop/narrow UI, request race, retry, saved status after reload |
| `bef0f97` | Issue creation, triage, resolution, reopening                     | 91 tests and 3 isolated Chromium workflows; SQL persistence checks          |

Implementation used the `codex/fleet-test-ops` feature branch, test-first behavior checks, and separate feature commits. At the user's request, `main` was fast-forwarded to the completed branch and all 94 tests, the production build, and serving smoke test passed on that checkout.

## Prepared workflow

1. Open a real business requirement using `.github/ISSUE_TEMPLATE/feature_request.yml`; describe the coordinator's purpose and observable acceptance criteria.
2. Create a focused branch such as `codex/filter-test-history`.
3. Implement and verify the change. Keep code, UI, commits, Issues, PRs, and review comments in English.
4. Open a PR using the repository template. Link only an actual existing Issue; include relevant tests and screenshots.
5. Obtain review and merge after the checks pass. Identify automated review as automated; do not present self-review as someone else's review.

## CI configuration

The workflow installs dependencies, checks formatting/types/lint, runs PostgreSQL-backed tests, builds production assets, and runs Chromium workflows and the compiled-server smoke test. Each integration fixture and browser server owns a generated PostgreSQL schema. Failure traces/screenshots are retained as artifacts.

Actions are pinned to release commits verified against the official repositories on 2026-10-02: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0), and [upload-artifact v7.0.1](https://github.com/actions/upload-artifact/releases/tag/v7.0.1).

The user selected [Calista0429/fleet-test-ops](https://github.com/Calista0429/fleet-test-ops) as the public repository. The source branch is `main`; actual hosted results are available in [GitHub Actions](https://github.com/Calista0429/fleet-test-ops/actions). Remote Issues/PRs and live deployment have not been performed. Local verification and the independent automated review are recorded in `verification.md`.
