# Verification record

Verified locally on 2026-10-02 with Node 24.21.0 and PostgreSQL 17.5. This record distinguishes executed local checks from the prepared remote workflow.

| Check                     | Observed result                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Clean `npm ci`            | Passed in a source copy with no installed packages or compiled contracts; automatic contract build completed            |
| Fresh migrations / seed   | Passed against a separate empty database; repeated seed retained 8 vehicles, 60 runs, 24 issues                         |
| Fresh application startup | Web HTTP 200, API reported 8 vehicles / 24 issues / 5 available vehicles                                                |
| `npm run format:check`    | Passed                                                                                                                  |
| `npm run typecheck`       | Passed across scripts, contracts, API, web, and browser tests                                                           |
| `npm run lint`            | Passed with no warnings                                                                                                 |
| `npm test`                | 91 passed: 20 contracts, 22 database, 30 API, 19 web behavior tests                                                     |
| `npm run build`           | Passed; API and web built; web code split into entry and chart chunks                                                   |
| `npm run test:e2e`        | 3 Chromium workflows passed using a generated database schema                                                           |
| `npm run test:smoke`      | Compiled index, direct vehicle navigation, readiness, API 404, built asset, missing asset, non-navigation checks passed |
| Dependency audit          | No reported vulnerabilities after the targeted esbuild 0.28.2 resolution                                                |
| Documentation             | Japanese disclosure expanded, images loaded, architecture HTML rendered; static SVG/ER targets included                 |

## Behavior evidence

- API fixtures verify that two issues do not double a run's mileage, and test records just outside/inside each JST boundary.
- Completed-only aggregate queries exclude cancelled and in-progress runs, fill missing days, and retain zero-run vehicles.
- UI fixtures verify late-response invalidation, error retry, filtering, saved status reloads, dependent run selection, trimmed descriptions, field errors, and pending-submit guards.
- Chromium resolves and reopens the deterministic critical issue, verifies its linked historical run, saves vehicle Maintenance, and checks the actual SQL values.
- A second Chromium case rejects a short description, creates one issue, reloads, and checks exactly one SQL row with that description.
- Desktop and 390px layouts were inspected. The document does not overflow horizontally; wide tables scroll inside their containers. Creation was opened with the keyboard and native controls remain focusable.
- An intentional API stop produced a visible error, and retry recovered after the server restarted.

Ordinary migration/seed do not overwrite saved edits. Reset guards were tested in isolated schemas; the active demo database was preserved during clean-setup verification. Browser test schema/context cleanup completed. Screenshots show editable synthetic data and can differ from a newly seeded database.

## Independent automated review

The final whole-branch review is pending. It will use a fresh reviewer context and be recorded here with findings and any verified fixes. This is not a human team review.

## Limits of this evidence

Docker startup, remote GitHub Issues/PRs, hosted CI, and public deployment were not executed. The Docker/CI configurations and collaboration templates are ready for review. Architecture HTML and static SVG rendering were checked; automated PNG/PDF download capture was unavailable, so export download success is not claimed.
