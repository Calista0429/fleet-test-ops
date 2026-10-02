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
| `npm test`                | 94 passed: 20 contracts, 22 database, 31 API/server, 21 web behavior tests                                              |
| `npm run build`           | Passed; API and web built; web code split into entry and chart chunks                                                   |
| `npm run test:e2e`        | 3 Chromium workflows passed using a generated database schema                                                           |
| `npm run test:smoke`      | Compiled index, direct vehicle navigation, readiness, API 404, built asset, missing asset, non-navigation checks passed |
| Dependency audit          | No reported vulnerabilities after the targeted esbuild 0.28.2 resolution                                                |
| Documentation             | English/Japanese switch works in both directions, images loaded, architecture HTML rendered; SVG/ER targets included    |

## Behavior evidence

- API fixtures verify that two issues do not double a run's mileage, and test records just outside/inside each JST boundary.
- Completed-only aggregate queries exclude cancelled and in-progress runs, fill missing days, and retain zero-run vehicles.
- UI fixtures verify late-response invalidation, error retry, filtering, saved status reloads, dependent run selection, trimmed descriptions, field errors, and pending-submit guards.
- Chromium resolves and reopens the deterministic critical issue, verifies its linked historical run, saves vehicle Maintenance, and checks the actual SQL values.
- A second Chromium case rejects a short description, creates one issue, reloads, and checks exactly one SQL row with that description.
- Desktop and 390px layouts were inspected. The document does not overflow horizontally; wide tables scroll inside their containers. Creation was opened with the keyboard and native controls remain focusable.
- An intentional API stop produced a visible error, and retry recovered after the server restarted.
- A child-server integration test terminates only its own idle PostgreSQL session. The server logs the failure, stays alive, reconnects, and returns readiness 200 on a later request.
- Incident rows expose creation time and run context in JST; a 101-vehicle fixture verifies filtering by an option on the second API page.

Ordinary migration/seed do not overwrite saved edits. Reset guards were tested in isolated schemas; the active demo database was preserved during clean-setup verification. Browser test schema/context cleanup completed. Screenshots show editable synthetic data and can differ from a newly seeded database.

## Independent automated review

One fresh-context gpt-6-astra reviewer inspected the complete five-task branch (`c483db5..38447b2`). It reported no Critical findings, three Important findings, and no Minor findings. This is an automated review, not a human team review.

All three Important findings were reproduced by failing behavior tests, then fixed in one pass:

| Finding                                                 | Verified change                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idle database connection failure terminated the API     | A pool error handler logs failures and permits replacement connections; the child-server recovery test failed before the fix and passed afterward |
| Incident register omitted creation time and related run | Rows display creation time, run start in JST, and a short run reference; the row-content test failed before the fix and passed afterward          |
| Vehicle filter stopped after the first 100 options      | Options load all API pages before enabling the selector; the 101st-vehicle selection test failed before the fix and passed afterward              |

After the fix pass, all 94 tests, three Chromium workflows, type checking, linting, production build, and compiled-server smoke passed. The final incident register was also inspected in the running compiled application. No second review was dispatched. Deferred minor findings: none.

## Implementation decisions

These are the complete recorded rulings, in decision order, with the cost if a decision proves wrong:

1. Use a manual linked worktree in `/private/tmp` for the nested repository because the app worktree tool targets the parent repository and has no repository-path argument. Cost: the app cannot manage this temporary worktree automatically.
2. Use the existing **Save status** accessible button name in the browser scenario, matching the earlier binding interface rather than the later plan example. Cost: a button-label and locator rename.
3. Build shared contracts during installation and before development startup, then watch them with the applications, because runtime workspace imports require generated JavaScript. Cost: an additional short TypeScript build during installation/startup.
4. Pin transitive esbuild to 0.28.2 because the reported Windows development-server advisory in 0.27.7 remained after the non-force audit fix. Cost: build-tool compatibility; the full build and browser checks passed with this resolution.
5. Leave actual Docker startup unverified because the daemon is stopped. Native PostgreSQL provides the verified local demo and the README identifies the alternative accurately. Cost: Docker-specific startup problems may remain.
6. Leave hosted Actions, remote Issues/PRs, and public deployment unexecuted because no remote destination was supplied. Committed configuration, templates, branch history, and local evidence describe the workflow honestly. Cost: hosted environment or repository configuration may need changes.
7. Leave architecture PNG/PDF downloads unverified because download capture was unavailable. HTML and static SVG render and the README discloses the limitation. Cost: export controls may need repair; static diagrams remain usable.

## Presentation refinement

On 2026-10-02, the user requested removal of the lower-left portfolio label and a single English/Japanese README switch. The sidebar's portfolio footer and its unused styles were removed. The complete Japanese content moved to `README.ja.md`; both documents use one linked SVG control that highlights the selected language and opens the other version. This follows GitHub's support for [repository-relative Markdown links](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#relative-links).

The production build, lint, and formatting checks passed. Both README switch directions were exercised in a local Markdown preview; images loaded, local link targets exist, and both SVG controls parse as valid XML. The running production UI no longer displays the sidebar label, and the desktop documentation screenshots were refreshed. This follow-up changes presentation and documentation; the earlier 94-test and three-workflow record above describes the verified application behavior before this refinement.

## Main branch and public repository

At the user's request on 2026-10-02, `main` was fast-forwarded to the complete implementation and presentation refinement (`ff7d65c`). A clean dependency installation, all 94 tests, the production build, and compiled-server smoke passed from the main checkout. Runtime environment files and private keys are absent from tracked files and history.

The user authorized creation of [Calista0429/fleet-test-ops](https://github.com/Calista0429/fleet-test-ops). GitHub metadata confirms the repository is public. Hosted checks run through the committed workflow; consult the actual [Actions results](https://github.com/Calista0429/fleet-test-ops/actions) for their latest status.

## Limits of this evidence

Docker startup, remote GitHub Issues/PRs, and live application deployment were not executed. The Docker configuration and collaboration templates are prepared. The local checks do not establish a hosted CI result; the Actions link above provides that separate evidence. Architecture HTML and static SVG rendering were checked; automated PNG/PDF download capture was unavailable, so export download success is not claimed.
