# Database modeling decisions

A vehicle has zero or more test runs. A test run belongs to exactly one vehicle and may have multiple issues. An issue derives its vehicle through its test run, avoiding two foreign keys that could disagree.

UUIDs identify records. License plates are unique. Foreign keys restrict parent deletion so test history is retained. CHECK and NOT NULL constraints reject invalid states, negative distances, invalid time ordering, incomplete completed runs, and inconsistent resolution timestamps. Distance uses numeric(10,2), not a floating-point database type.

Driver names are intentional historical snapshots. Staff identity management is outside this portfolio's scope. Operational vehicle status is a coordinator decision and does not change automatically when an issue is resolved.

The test_runs(vehicle_id, started_at) index serves vehicle history filters. issues(test_run_id) serves linked incident counts. issues(status, severity) serves triage filters. The unique license-plate constraint creates its own index.

Timestamps are stored with time zones, returned as UTC ISO strings, and displayed in JST. Completed distance counts completed runs started within the selected JST date interval. It is aggregated independently of issues so several issues cannot multiply a run's distance.

Migrations run transactionally and record their applied versions. Repeatable seeds use stable IDs and preserve coordinator edits. An explicit local reset command replaces only the three business tables, retains migration history, and never runs automatically.

Integration tests create isolated schemas, without a public-schema fallback. Their cleanup removes only their generated schema; sample application records remain untouched.
