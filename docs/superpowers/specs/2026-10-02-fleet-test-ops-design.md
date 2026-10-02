# Fleet Test Operations Dashboard — Design

Date: 2026-10-02 (Asia/Tokyo)

Status: Approved by the user on 2026-10-02. Application implemented; final verification/review evidence is recorded in docs/verification.md.

## Purpose and audience

Build a small, complete portfolio application for a Bosch Japan internship whose supplied description names TypeScript, React, SQL data modeling, GitHub collaboration, and web solutions for business-unit needs.

The simulated user is a test coordinator managing an automotive test fleet. They need to understand current vehicle availability, inspect test activity, and track operational issues. This scenario is a project assumption; it is not a claim about the hiring team's actual systems or department. All sample vehicles, people, and incidents are fictional.

Success means a reviewer can follow a three-minute workflow: discover a severe unresolved issue, inspect its vehicle and test run, update the issue, update the vehicle's operational status, and see persisted changes in the overview. The repository must make the SQL model and actual development process easy to inspect.

## Language requirements

- Use English for identifiers, comments, interface copy, API errors, commit messages, Issues, PR descriptions, tests, and primary documentation.
- Provide one English/Japanese language switch at the top of the README, linking `README.md` and `README.ja.md` so only the selected language is displayed.
- Keep English and Japanese sections aligned as documentation evolves. Translate meaning and metric definitions, not code identifiers or commands.
- Use the architecture-diagram skill to produce an English HTML diagram and a matching static SVG embedded in the README. Include a separate ER diagram.

## Approaches considered

1. **React + TypeScript, Express + TypeScript, PostgreSQL with explicit SQL — selected.** A small API makes read/write behavior visible, while handwritten migrations and parameterized queries provide direct evidence of SQL modeling. Shared validation schemas reduce interface drift.
2. **React with a hosted database client.** Faster infrastructure setup, but authentication and service configuration would compete with the core demonstration, and the API responsibilities would be less visible.
3. **One full-stack framework.** A viable alternative, but framework-specific rendering and routing behavior are unnecessary for three internal-tool screens. Separate web/API components keep the interview explanation straightforward.

## MVP scope

### Overview

- Show current vehicle count, current available-vehicle count, and current unresolved-issue count.
- Show completed test distance and completed test count for a selected date range.
- Show two charts: completed distance by day and completed distance by vehicle.
- Show a vehicle table with search, operational-status filtering, sorting, and links to vehicle details.
- Include visible loading, empty, and retryable error states.

### Vehicle details

- Show the vehicle identifier, license plate, model, and current operational status.
- List its test runs with started time, run status, distance, and linked issue count.
- Filter runs by date. Link from a run to its issues.
- Allow a coordinator to update the vehicle's operational status with explicit confirmation of the saved result.

### Issue management

- List issues with vehicle, related test run, type, severity, status, and creation time.
- Filter by vehicle, severity, and status; support deterministic sorting and pagination.
- Create an issue against an existing test run. Select the vehicle first, then a run belonging to that vehicle.
- Update description, severity, and status. Validate input on the client and again on the server.
- Set the resolution timestamp on resolution and clear it when reopening an issue.
- Provide a direct link from an issue to its vehicle details.

### Explicitly deferred

Maps, GPS ingestion, live telemetry, device-health scoring, AI inference, notifications, file uploads, multi-user authentication, and cloud-provider-specific deployment are outside the first version. No sensor-health metric is inferred from incident records.

## Architecture and responsibilities

Use a small npm workspace:

```text
fleet-test-ops/
  apps/web/          React, Vite, browser state, accessible tables/forms, Recharts
  apps/api/          Express, validation, application rules, SQL queries
  packages/contracts/ Shared TypeScript and Zod request/response definitions
  database/         Versioned SQL migrations, seed data, model documentation
  docs/             Architecture, ER diagram, design, workflow, demo narrative
  .github/          Issue/PR templates and GitHub Actions
```

The browser calls `/api` through the Vite proxy during development. The API serves the compiled web application in the production build, keeping deployed browser requests on the same origin. The browser never receives database credentials or talks directly to PostgreSQL.

The API uses `pg` with a connection pool and parameterized SQL. Sort fields and directions are selected from an allowlist, not inserted from unchecked user strings. Shared Zod schemas validate requests and document response shapes. Small query modules handle vehicles, test runs, issues, and overview aggregates; no generic repository layer is needed.

Local PostgreSQL is supplied through Docker Compose with a named data volume and a health check. Configuration comes from documented environment variables with a checked-in example. Database readiness is checked before migration and seed commands. The design also permits an existing PostgreSQL installation by changing `DATABASE_URL`.

## Relational model

### vehicles

| Column | Type | Rule |
| --- | --- | --- |
| id | UUID | Primary key |
| license_plate | text | Required, unique |
| model | text | Required, nonempty |
| status | text | `available`, `testing`, or `maintenance` |
| created_at | timestamptz | Required, server default |
| updated_at | timestamptz | Required, server maintained |

### test_runs

| Column | Type | Rule |
| --- | --- | --- |
| id | UUID | Primary key |
| vehicle_id | UUID | Required FK to vehicles; restrict deletion |
| driver_name | text | Required; historical display-name snapshot |
| started_at | timestamptz | Required |
| ended_at | timestamptz | Nullable while in progress; never before started_at |
| distance_km | numeric(10,2) | Nullable while in progress; nonnegative when supplied |
| status | text | `in_progress`, `completed`, or `cancelled` |

Completed runs require both ended_at and distance_km. Driver identities and staff administration are outside the MVP, so a name snapshot is intentional rather than a partially implemented user table.

### issues

| Column | Type | Rule |
| --- | --- | --- |
| id | UUID | Primary key |
| test_run_id | UUID | Required FK to test_runs; restrict deletion |
| issue_type | text | `sensor_failure`, `software_crash`, or `other` |
| description | text | Trimmed, 10–2000 characters |
| severity | text | `low`, `medium`, `high`, or `critical` |
| status | text | `open`, `in_progress`, or `resolved` |
| created_at | timestamptz | Required, server default |
| updated_at | timestamptz | Required, server maintained |
| resolved_at | timestamptz | Present if and only if status is resolved |

A vehicle has zero or more test runs. A test run has zero or more issues. The issue's vehicle is derived through its test run; duplicating vehicle_id on issues would introduce a consistency risk. There is no destructive delete operation in the first version, so historical records remain available.

Use CHECK constraints together with NOT NULL where appropriate. Check allowed statuses, distance bounds, end-time ordering, completed-run completeness, description length, and resolution-time consistency. Keep the model visible in SQL migration files. A small schema_migrations table tracks migration versions and is implementation metadata, not a fourth business entity.

Index test_runs(vehicle_id, started_at), and indexes supporting issue status/severity filtering and test_run_id joins. Document each index's intended query. Add further indexes only if query evidence warrants them.

## Metrics and time semantics

- Store timestamps as timestamptz and return ISO 8601 timestamps in UTC. Display dates and times in Asia/Tokyo, explicitly labeled JST.
- Accept `from` and `to` as calendar dates in Asia/Tokyo. Convert the inclusive UI date range to `[from midnight, midnight after to)` for SQL filtering. The default range is the last seven calendar days including today in Asia/Tokyo.
- The three current-state cards describe the whole fleet now and are labeled accordingly. Date controls affect historical completed-run metrics and charts, not current availability or unresolved issues.
- Completed distance is the sum of distance_km for completed runs whose started_at falls in the selected interval. Cancelled and in-progress runs do not contribute.
- Charts use the same inclusion rule as the completed-distance card. Group days in Asia/Tokyo and fill missing days with zero.
- An unresolved issue has status open or in_progress. A vehicle is available only if its stored status is available. Issue resolution does not automatically change vehicle status; that decision remains an explicit coordinator action.
- Aggregate runs before joining issue summaries, or query the measures separately, so multiple issues never multiply a run's distance. Cover this case in an integration test.

## API surface

All application routes use the `/api` prefix.

| Method and route | Purpose |
| --- | --- |
| GET /health | Readiness response, including database reachability |
| GET /dashboard?from=&to= | Current-state cards, selected-period metrics, two chart series |
| GET /vehicles | Searchable/filterable vehicle list with pagination and allowed sorting |
| GET /vehicles/:id | Vehicle details |
| PATCH /vehicles/:id/status | Persist an operational-status change |
| GET /test-runs?vehicleId=&from=&to= | Filtered runs with issue counts |
| GET /issues | Filtered/paginated issue list with vehicle and run context |
| POST /issues | Create an issue linked to a valid run |
| PATCH /issues/:id | Update editable issue fields and resolution state |

List responses include items, page, pageSize, and total. Validate UUIDs, dates, pagination bounds, and allowed filters. Use stable sorting with an ID tie-breaker. Dates must exist on the calendar and from must not exceed to. Responses use `{ error: { code, message, fieldErrors? } }` for errors, with 400 for invalid input, 404 for missing records, and 500 for an unexpected failure. Keep internal SQL details out of browser-visible errors.

Use RETURNING for mutations and return 404 when no row was updated. Let the server own updated_at and resolved_at. Disable repeated submissions while a mutation is pending; invalidate or reload affected reads after it succeeds. Preserve useful user input on validation or network failure.

## Interface direction

Use a restrained operations-tool layout with a persistent navigation rail, a clear page title, well-spaced metric cards, concise charts, and readable tables. Make visual choices support the task: distinguish severity from issue status, display distance units, and expose active filters. English interface copy is required.

Use semantic HTML tables, labeled controls, keyboard-accessible forms/dialogs, visible focus states, and textual labels alongside status colors. Provide narrow-screen table scrolling without clipping controls. A global app localization system is unnecessary; the requested Japanese localization is for the README.

## Sample data

Provide a deterministic seed with approximately 8 vehicles, 60 test runs, and 24 issues spanning different statuses and severities. Anchor timestamps to a documented seed date derived from the current JST date so the default view contains recent data. Include vehicles without runs, runs without issues, a run with multiple issues, an in-progress run with no end time, and both unresolved and resolved critical issues.

Resetting sample data is an explicit local command. Normal startup and migrations never overwrite an existing database. Seed inserts use stable IDs and are repeatable without duplicating records.

## Verification and acceptance

- Integration tests against actual PostgreSQL validate foreign keys, invalid distances/timestamps, completed-run requirements, and issue-resolution consistency.
- Test dashboard aggregation with multiple issues on one run and zero-run vehicles. Test JST boundaries and zero-filled chart days.
- Test issue creation, update, reopening, missing IDs, invalid references, filters, and pagination through the API.
- A browser-level test follows the core workflow and verifies persistence after reload. Include loading, empty, and API-error behavior in focused UI checks where it is material.
- GitHub Actions run type checks, lint, tests, and a production build, with a PostgreSQL service for database-backed checks.
- Verify the application in a real browser at a desktop width and a narrow width. Inspect documentation links, README Japanese expansion, ER cardinalities, and architecture diagram readability.
- Test the local setup procedure from documented commands before publishing it as working. Distinguish configured CI from an observed hosted CI result.

## Documentation and GitHub workflow

The README leads with the business problem and demo flow, followed by screenshots, architecture, SQL modeling decisions, setup, verification, and limitations. Until application code exists, it explicitly identifies the repository as being in design review and does not present planned commands as tested instructions.

The architecture HTML includes the skill's export controls and displays without its export dependencies; image/PDF export uses the template's pinned CDN dependencies. The static SVG allows GitHub README readers to see the architecture without executing HTML. The ER diagram uses the same table and column names as the migrations.

Organize work into actual Issues and focused PRs: database/contracts, API, overview/vehicle screens, issue workflow, and documentation/verification. Use English descriptions with a business purpose and acceptance criteria. Record real findings and fixes; do not manufacture reviewers, bugs, or historical collaboration. Local commits can document work immediately. Remote Issues and PRs require an actual GitHub repository; no destination has been supplied yet.

## Review boundary

This document records the proposed architecture and acceptance criteria. After the user reviews this written design, create an implementation plan and agree its execution method before application implementation, as required by the active brainstorming workflow.
