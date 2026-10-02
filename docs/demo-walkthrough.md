# Five-minute demo walkthrough

The coordinator's job is to decide which vehicle is ready, inspect the evidence behind an incident, and record follow-up. All data is fictional.

1. Open **Fleet overview**. Explain the current-state strip and select a historical date range. Current vehicle availability and unresolved issues still describe the whole fleet; completed distance uses the chosen period.
2. Open **Issue management**, choose **Critical** and **Open**, and find **Seeded critical sensor fault**. Open its vehicle link. The link carries the run's JST date, so an older incident's evidence remains visible.
3. Inspect the test history. A run can have several linked issues, but completed distance is counted once. In-progress runs can have no recorded distance and show an explanatory dash.
4. Return to the incident, choose **Edit issue**, select **Resolved**, and save. Reload and filter for resolved issues to show that the server saved the result. Reopen the same issue to demonstrate that its resolution timestamp clears.
5. Open the affected vehicle and save **Maintenance**. Reload to verify persistence, then return to the overview to see current availability change. Vehicle status and issue status are independent operational decisions.
6. Create a new issue: select a vehicle and test run, enter a description, and save. Show the validation message for a short description first. Changing vehicles clears the run selection.

For the engineering discussion, open the README's ER diagram and `database/migrations/001_initial.sql`. Explain why issues store only `test_run_id`, how SQL constraints protect the model, and how parameterized queries and shared schemas validate each boundary.

The reproducible test evidence includes real PostgreSQL aggregates, JST boundaries, request cancellation, persistence, and the same core flow in Chromium. The Git history records feature milestones; GitHub templates and CI configuration are prepared locally. Remote Issues/PRs and a hosted CI result have not been created.
