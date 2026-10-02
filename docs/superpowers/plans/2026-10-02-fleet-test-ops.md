# Fleet Test Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reviewable English-language fleet operations application with real PostgreSQL persistence, a complete incident workflow, and an English README with a switchable Japanese version.

**Architecture:** A React/Vite web application calls a TypeScript/Express API. The API uses shared Zod contracts and parameterized PostgreSQL queries. Versioned SQL migrations, deterministic sample data, and focused database/browser tests make the business behavior inspectable.

**Tech Stack:** React, TypeScript, Vite, Recharts, Express, pg, Zod, Vitest, Testing Library, Supertest, Playwright, PostgreSQL, Docker Compose, npm workspaces, GitHub Actions.

**Spec:** [Approved design](../specs/2026-10-02-fleet-test-ops-design.md).

**Status:** Approved and executed using Native execution. Feature milestones are complete; final verification/review evidence is recorded in docs/verification.md.

## Global Constraints

- Use English for identifiers, comments, interface copy, API errors, commit messages, Issues, PR descriptions, tests, and primary documentation.
- Provide one English/Japanese language switch at the top of the README, linking `README.md` and `README.ja.md` so only the selected language is displayed.
- Keep English and Japanese sections aligned as documentation evolves. Translate meaning and metric definitions, not code identifiers or commands.
- Use the architecture-diagram skill to produce an English HTML diagram and a matching static SVG embedded in the README. Include a separate ER diagram.
- All sample vehicles, people, and incidents are fictional.
- Store timestamps as timestamptz and return ISO 8601 timestamps in UTC. Display dates and times in Asia/Tokyo, explicitly labeled JST.
- The three current-state cards describe the whole fleet now and are labeled accordingly. Date controls affect historical completed-run metrics and charts, not current availability or unresolved issues.
- Completed distance is the sum of distance_km for completed runs whose started_at falls in the selected interval. Cancelled and in-progress runs do not contribute.
- An issue's vehicle is derived through its test run; duplicating vehicle_id on issues would introduce a consistency risk.
- Normal startup and migrations never overwrite an existing database.
- Remote Issues and PRs require an actual GitHub repository; no destination has been supplied yet.

## Review Focus

- Impossible calendar dates, reversed date ranges, and runs crossing JST midnight: reject invalid ranges and count records in the explicitly selected JST interval. Task 1 owns date tests; Task 2 owns API aggregate tests.
- Multiple issues for a single run: distance totals must count the run once. Task 2 owns the regression test.
- A slow earlier request finishing after a newer filter request: the newest filter must retain control of the displayed result. Task 3 owns a deferred-response UI test.
- A coordinator reopening a resolved issue: resolved_at must be cleared in both the response and persisted record. Task 2 owns API coverage and Task 4 owns visible UI coverage.
- Changing the selected vehicle while creating an issue: clear the previously selected run and never submit an inconsistent vehicle/run choice. Task 4 owns the form test.

## Execution context

The project has its own local repository at `fleet-test-ops/`, separate from the parent directory of job-application materials. The initial commit records only the reviewed design, diagrams, and bilingual README.

Before application execution, invoke using-git-worktrees and inspect existing attachments. If a managed worktree cannot target this nested repository, use a local Git worktree for this repository at an authorized writable path. Use `codex/` for implementation branches. Do not include parent-directory files or stage unrelated changes.

Use Node.js 24 for the implementation environment and PostgreSQL 17 for the reproducible local/test database. The current machine has Node.js 24 and a PostgreSQL 17 client; database-server and Docker-daemon readiness are not yet verified. Check these before choosing the local database route. Pin resolved dependency versions with `package-lock.json`; confirm compatibility when installing.

Recommended execution method: **Native**. The five tasks share the contracts and database fixture, and a single implementer can keep their interfaces consistent. Run the prescribed independent review after the branch is complete. No subagent has been started during planning.

## File map and responsibilities

```text
package.json                         Workspace orchestration and verification commands
package-lock.json                    Reproducible dependency resolution
.nvmrc                               Node 24
.env.example                         Documented local configuration, no real credentials
.gitignore                           Dependencies, builds, env files, browser outputs
compose.yaml                         Local PostgreSQL service and persistent volume
tsconfig.base.json                   Shared strict TypeScript settings
eslint.config.mjs                    TypeScript/React lint rules
vitest.config.ts                     Unit/integration test discovery; excludes browser tests
packages/contracts/src/index.ts      Public request/response schemas and types
packages/contracts/src/dates.ts      Calendar validation and JST range conversion
packages/contracts/test/             Contract and time-boundary tests
database/migrations/001_initial.sql  Business tables, constraints, indexes
database/migrate.ts                  Transactional versioned migration runner
database/seed.ts                     Repeatable fictional sample data
database/reset-demo.ts               Explicit reset of local fictional application data
database/test/                       Real PostgreSQL model tests
tests/support/database.ts            Isolated test schema and fixture helpers
apps/api/src/app.ts                  Injectable Express application; no listening side effect
apps/api/src/server.ts               Environment loading, pool startup, graceful shutdown
apps/api/src/errors.ts               Consistent API error responses
apps/api/src/routes/                 Validated dashboard/vehicle/run/issue routes
apps/api/src/queries/                Parameterized SQL and row-to-contract mapping
apps/api/test/                       Route, persistence, pagination, aggregation tests
apps/web/src/App.tsx                 Screen routing and application shell
apps/web/src/lib/api.ts              Typed fetch and structured API errors
apps/web/src/lib/useApi.ts           Cancellation and loading/error state
apps/web/src/lib/format.ts           JST dates, readable counts, kilometer units
apps/web/src/components/             Reused badges, table controls, state panels
apps/web/src/features/overview/      Metrics, charts, vehicle list
apps/web/src/features/vehicles/      Vehicle details, runs, status update
apps/web/src/features/issues/        List, filters, issue creation and editing
apps/web/src/styles.css              Intentional accessible operations-tool design
apps/web/vite.config.ts              React plugin and development API proxy
tests/e2e/fleet-workflow.spec.ts      Browser persistence and navigation scenario
playwright.config.ts                Browser run against seeded test application
.github/ISSUE_TEMPLATE/feature.yml   Business-purpose and acceptance prompts
.github/pull_request_template.md    Purpose, changes, verification, screenshots
.github/workflows/ci.yml             Type/lint/test/build with PostgreSQL
docs/github-workflow.md              Actual workflow and repository publishing prerequisites
docs/demo-walkthrough.md             Three-minute reviewer narrative
docs/database-model.md               Constraints, historical snapshots, index reasons
docs/screenshots/                    Verified application screenshots
README.md                           Actual setup and evidence, in English and Japanese
docs/architecture.html              Existing architecture-diagram artifact
docs/architecture.svg               Existing README architecture export
docs/erd.svg                        Existing README ER diagram export
```

---

### Task 1: Deliver a runnable database foundation and shared contracts

**Files:** Create workspace/configuration files, `packages/contracts/`, `database/`, and `tests/support/database.ts`. Add model rationale to `docs/database-model.md`.

**Interfaces:**

- Consumes: the approved schema and metric definitions.
- Produces: `migrate(pool: Pool): Promise<void>`, `seed(pool: Pool, anchorDate: string): Promise<void>`, `createTestDatabase(anchorDate?: string): Promise<{ pool: Pool; dispose(): Promise<void> }>`, and shared contracts from `@fleet/contracts`.
- Produces: `jstRange(from: string, to: string): { start: string; endExclusive: string }`, `jstToday(now?: Date): string`, and `defaultDateRange(now?: Date): { from: string; to: string }`.

- [x] **Step 1: Establish the minimal testable workspace.** Set the private root package with `workspaces: ["apps/*", "packages/*"]`, `.nvmrc` containing `24`, strict TypeScript, and a lockfile. Use these package names: `@fleet/contracts`, `@fleet/api`, `@fleet/web`. Install test/database dependencies first; add the web scaffold in Task 3. Expose the following root commands:

```json
{
  "scripts": {
    "db:migrate": "tsx database/migrate.ts",
    "db:seed": "tsx database/seed.ts",
    "db:reset-demo": "tsx database/reset-demo.ts --confirm-demo-data-reset",
    "test:contracts": "vitest run packages/contracts/test",
    "test:db": "vitest run database/test",
    "test:api": "vitest run apps/api/test",
    "test:web": "vitest run apps/web/src",
    "test": "vitest run",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "eslint . --max-warnings=0",
    "build": "npm run build -w @fleet/contracts && npm run build -w @fleet/api && npm run build -w @fleet/web",
    "dev": "concurrently -k \"npm run dev -w @fleet/api\" \"npm run dev -w @fleet/web\"",
    "start": "node --env-file=.env apps/api/dist/server.js",
    "test:e2e": "playwright test"
  }
}
```

Do not run commands for packages that do not exist yet. The first task's acceptance uses only contracts, database tests, and the data setup commands.

Configure a `postgres:17` service with a named volume, port `5433:5432`, and `pg_isready` health check. The example local URL is `postgresql://fleet:local_fleet_password@localhost:5433/fleet_ops`; the password is a documented disposable local default. If Docker is unavailable, use a reachable PostgreSQL instance with `DATABASE_URL`. Tests create their own generated schema in that instance and never truncate public application tables.

- [x] **Step 2: Write failing contract and database tests.** Include the following date and constraint cases, using actual PostgreSQL in the model tests:

```ts
it("converts inclusive JST calendar dates to an exclusive UTC interval", () => {
  expect(jstRange("2026-10-01", "2026-10-02")).toEqual({
    start: "2026-09-30T15:00:00.000Z",
    endExclusive: "2026-10-02T15:00:00.000Z",
  });
});

it.each(["2026-02-30", "2026-13-01", "2026-00-01"])(
  "rejects an impossible calendar date %s", (from) => {
    expect(dateRangeSchema.safeParse({ from, to: "2026-12-31" }).success).toBe(false);
  },
);

it("rejects negative distance at the database boundary", async () => {
  await expect(pool.query(
    `INSERT INTO test_runs
       (id, vehicle_id, driver_name, started_at, ended_at, distance_km, status)
     VALUES ($1, $2, 'Sample Driver', $3, $4, -1, 'completed')`,
    [randomUUID(), vehicleId, "2026-10-01T00:00:00Z", "2026-10-01T01:00:00Z"],
  )).rejects.toMatchObject({ code: "23514" });
});
```

Also test reversed ranges, current JST date around UTC midnight, duplicate license plates, nonexistent vehicle/run foreign keys, end-before-start, completed runs without distance/end, accepted in-progress runs with null distance/end, and mismatched issue resolution state. Fixture helpers create a real parent vehicle/run first so each test isolates the intended constraint. Add reset-command tests that reject a missing confirmation flag and a non-demo database before executing any write.

- [x] **Step 3: Run the tests before implementation.** Run `npm run test:contracts` and `npm run test:db`. Confirm missing contracts/migration behavior causes the expected failures; resolve environment failures before treating them as the red test cycle.

- [x] **Step 4: Implement the schema and date contracts.** Use UUID primary keys, explicit required fields, and these SQL constraints:

```sql
CREATE TABLE vehicles (
  id uuid PRIMARY KEY,
  license_plate text NOT NULL UNIQUE CHECK (length(trim(license_plate)) > 0),
  model text NOT NULL CHECK (length(trim(model)) > 0),
  status text NOT NULL CHECK (status IN ('available', 'testing', 'maintenance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE test_runs (
  id uuid PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_name text NOT NULL CHECK (length(trim(driver_name)) > 0),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  distance_km numeric(10,2) CHECK (distance_km >= 0),
  status text NOT NULL CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  CHECK (ended_at IS NULL OR ended_at >= started_at),
  CHECK (status <> 'completed' OR (ended_at IS NOT NULL AND distance_km IS NOT NULL))
);

CREATE TABLE issues (
  id uuid PRIMARY KEY,
  test_run_id uuid NOT NULL REFERENCES test_runs(id) ON DELETE RESTRICT,
  issue_type text NOT NULL CHECK (issue_type IN ('sensor_failure', 'software_crash', 'other')),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 2000),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK ((status = 'resolved') = (resolved_at IS NOT NULL)),
  CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

CREATE INDEX test_runs_vehicle_started_idx ON test_runs(vehicle_id, started_at);
CREATE INDEX issues_run_idx ON issues(test_run_id);
CREATE INDEX issues_status_severity_idx ON issues(status, severity);
```

The API uses server-maintained timestamps for normal mutations. Direct SQL inserts still obey database constraints. The migration runner creates schema_migrations if needed, runs each unapplied SQL file in a transaction, and inserts its version only after successful execution. Rerunning migrations must preserve seeded records.

Implement calendar validation with a YYYY-MM-DD regex followed by an actual UTC calendar round-trip. Range conversion uses fixed JST midnight (`T00:00:00+09:00`) and adds one calendar day to the selected end date. The following public type names and fields are binding for later tasks:

```ts
type VehicleStatus = "available" | "testing" | "maintenance";
type IssueStatus = "open" | "in_progress" | "resolved";
type Severity = "low" | "medium" | "high" | "critical";
type IssueType = "sensor_failure" | "software_crash" | "other";
interface DateRange { from: string; to: string }
interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
interface Vehicle {
  id: string; licensePlate: string; model: string; status: VehicleStatus;
  createdAt: string; updatedAt: string;
}
interface TestRun {
  id: string; vehicleId: string; driverName: string;
  startedAt: string; endedAt: string | null; distanceKm: number | null;
  status: "in_progress" | "completed" | "cancelled"; issueCount: number;
}
interface Issue {
  id: string; testRunId: string; vehicleId: string; licensePlate: string;
  runStartedAt: string; issueType: IssueType; description: string;
  severity: Severity; status: IssueStatus;
  createdAt: string; updatedAt: string; resolvedAt: string | null;
}
interface DashboardResponse {
  range: DateRange;
  current: { vehicleCount: number; availableVehicleCount: number; unresolvedIssueCount: number };
  period: { completedRunCount: number; completedDistanceKm: number };
  distanceByDay: { date: string; distanceKm: number }[];
  distanceByVehicle: { vehicleId: string; licensePlate: string; distanceKm: number }[];
}
interface CreateIssueInput {
  testRunId: string; issueType: IssueType; description: string; severity: Severity;
}
interface UpdateIssueInput {
  description?: string; severity?: Severity; status?: IssueStatus;
}
interface ApiErrorBody {
  error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
}
```

Define matching runtime Zod schemas, including dateRangeSchema, vehicleStatusSchema, createIssueSchema, updateIssueSchema, and dashboardResponseSchema. Require at least one field in an issue update. Set page defaults to 1, pageSize defaults to 20, and pageSize maximum to 100. UUID query/path values must validate as UUIDs. Issue descriptions are trimmed before checking 10–2000 characters.

- [x] **Step 5: Add repeatable sample data and verify the foundation.** Seed 8 vehicles, 60 runs, and 24 issues using stable UUIDs and an anchor JST date. Use INSERT ... ON CONFLICT DO NOTHING for existing records; do not delete or overwrite existing mutations. Include the edge conditions from the design and one open critical issue with the exact description `Seeded critical sensor fault`. The test database helper creates a uniquely named schema, applies migrations using its search_path, and drops only that generated schema during cleanup.

Load .env for direct CLI execution of migrate/seed/reset scripts, while exported functions have no command-line side effects when imported by tests. The explicit reset command requires `--confirm-demo-data-reset`, a loopback database host, and the database name `fleet_ops`. It verifies these conditions before truncating only issues, test_runs, and vehicles, then runs seed in the same transaction. It preserves schema_migrations, uses no CASCADE, and is never called by normal startup. Exercise the reset implementation against an isolated fixture schema during tests, then document its effect on saved demo edits.

Run `npm run db:migrate`, `npm run db:seed`, both commands a second time, `npm run test:contracts`, and `npm run test:db`. Query row counts before and after the second pass; expect unchanged counts and all model/date tests passing. Commit with `feat: add PostgreSQL model and shared validation contracts`.

### Task 2: Deliver the operational API with persisted mutations

**Files:** Create `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/{app,server,errors}.ts`, focused route/query files, and `apps/api/test/`.

**Interfaces:**

- Consumes: the contracts, migration runner, and isolated fixture from Task 1.
- Produces: `createApp(pool: Pool): Express`, `getDashboard(pool: Pool, range: DateRange): Promise<DashboardResponse>`, `listVehicles(pool: Pool, filters: VehicleFilters): Promise<Page<Vehicle>>`, `getVehicle(pool: Pool, id: string): Promise<Vehicle | null>`, `updateVehicleStatus(pool: Pool, id: string, status: VehicleStatus): Promise<Vehicle | null>`.
- Produces: `listTestRuns(pool: Pool, filters: TestRunFilters): Promise<Page<TestRun>>`, `listIssues(pool: Pool, filters: IssueFilters): Promise<Page<Issue>>`, `createIssue(pool: Pool, input: CreateIssueInput): Promise<Issue>`, `updateIssue(pool: Pool, id: string, input: UpdateIssueInput): Promise<Issue | null>`.
- Define VehicleFilters with `search?`, `status?`, `page`, `pageSize`, `sort: "licensePlate" | "model" | "status"`, `direction: "asc" | "desc"`. Define TestRunFilters with `vehicleId`, optional `from/to`, `page`, `pageSize`. Define IssueFilters with optional `vehicleId/testRunId/severity/status` plus page/pageSize. All list queries use an ID tie-breaker; run/issue defaults sort newest first.

- [x] **Step 1: Write failing API tests.** Test health/readiness, each read route, invalid input, missing records, and actual writes. Include these regression tests:

```ts
it("does not multiply completed distance when a run has several issues", async () => {
  const db = await createTestDatabase();
  try {
    const run = await insertRun(db.pool, { distanceKm: 42.5, startedAt: "2026-10-01T00:00:00Z" });
    await insertIssue(db.pool, { testRunId: run.id });
    await insertIssue(db.pool, { testRunId: run.id });
    const response = await request(createApp(db.pool))
      .get("/api/dashboard?from=2026-10-01&to=2026-10-01");
    expect(response.status).toBe(200);
    expect(response.body.period.completedDistanceKm).toBe(42.5);
  } finally { await db.dispose(); }
});

it("clears the persisted resolution timestamp when reopening an issue", async () => {
  const response = await request(app)
    .patch(`/api/issues/${resolvedIssueId}`).send({ status: "open" });
  expect(response.status).toBe(200);
  expect(response.body.resolvedAt).toBeNull();
  const result = await pool.query("SELECT resolved_at FROM issues WHERE id = $1", [resolvedIssueId]);
  expect(result.rows[0].resolved_at).toBeNull();
});
```

`insertRun` and `insertIssue` are fixture helpers in tests/support/database.ts; they generate UUIDs, insert required parents, and default to a completed one-hour run and an open high-severity issue. createTestDatabase applies schema only unless explicitly requested to seed, so precise aggregate tests start with no unrelated runs.

Include records at JST start, one millisecond before the start, one millisecond before the exclusive end, and at the exclusive end. Test zero-filled days, cancelled/in-progress exclusions, current-state card independence from the selected date range, invalid sort fields, negative pages, filtering totals, and stable pagination.

- [x] **Step 2: Run the API tests before implementation.** Run `npm run test:api`. Expect missing app/query behavior to fail. Confirm the PostgreSQL fixture is reachable.

- [x] **Step 3: Implement aggregate queries, reads, and request validation.** Completed-distance queries operate on test_runs without joining raw issues:

```sql
SELECT COALESCE(SUM(distance_km), 0) AS distance_km, COUNT(*) AS run_count
FROM test_runs
WHERE status = 'completed' AND started_at >= $1 AND started_at < $2;

SELECT (started_at AT TIME ZONE 'Asia/Tokyo')::date AS date,
       SUM(distance_km) AS distance_km
FROM test_runs
WHERE status = 'completed' AND started_at >= $1 AND started_at < $2
GROUP BY 1 ORDER BY 1;
```

Convert pg numeric/count results explicitly to JSON numbers and timestamps to UTC ISO strings. Add missing days in the API using the validated date interval. Count vehicle states and unresolved issues in separate current-state queries. For run issue counts, aggregate issues by test_run_id before joining. Derive issue vehicle context with issues → test_runs → vehicles.

Register the exact `/api` routes from the spec. Parse route/query/body input before executing queries. Search uses a parameterized ILIKE value; ordering uses a fixed SQL-column map. Reuse filtered WHERE clauses for both the count query and page query. Apply default date range only when both dashboard dates are absent; reject partial ranges.

- [x] **Step 4: Implement writes and error behavior.** Issue creation always starts in open status. Issue updates preserve unspecified fields, set updated_at to now(), set resolved_at to now() when entering resolved, preserve it when already resolved, and clear it when reopening:

```sql
UPDATE issues
SET description = COALESCE($2, description),
    severity = COALESCE($3, severity),
    status = COALESCE($4, status),
    resolved_at = CASE
      WHEN COALESCE($4, status) = 'resolved' THEN COALESCE(resolved_at, now())
      ELSE NULL
    END,
    updated_at = now()
WHERE id = $1
RETURNING *;
```

Return the joined Issue contract after writes. Missing mutation targets return 404. A foreign-key violation on issue creation returns a field-specific 400. Unexpected failures return a generic structured 500 and are logged on the server. Add a 404 handler for unknown /api routes before static web fallback. `/api/health` performs a short database query and returns 503 if unavailable. server.ts loads .env, starts the pool/listener, and closes both on SIGINT/SIGTERM.

- [x] **Step 5: Verify the API as an independent deliverable.** Run `npm run test:contracts`, `npm run test:db`, `npm run test:api`, and the API typecheck/build. Start the API and request /api/health, dashboard, and a paginated vehicle list. Expect JSON matching the contracts, correct fixture aggregates, and persisted updates. Commit with `feat: add validated fleet operations API`.

### Task 3: Deliver the overview and vehicle-detail experience

**Files:** Create the React/Vite workspace, shared web libraries/components, overview/vehicle feature files, styling, and their focused tests.

**Interfaces:**

- Consumes: the Task 2 API and shared contracts.
- Produces: `apiRequest<T>(path: string, options?: RequestInit): Promise<T>`, `useApi<T>(path: string): { data: T | null; loading: boolean; error: ApiClientError | null; reload(): void }`, `ApiClientError` exposing status/code/fieldErrors.
- Produces: `OverviewPage`, `VehicleDetailPage`, `StatusBadge`, `StatePanel`, `formatJst(iso: string): string`, `formatDistance(km: number | null): string`.
- Routes: `/` for overview, `/vehicles/:id` for details, `/issues` reserved for Task 4. Use React Router and keep the date range/filter state in URL query parameters where useful.

- [x] **Step 1: Scaffold the web workspace and write failing UI tests.** Create a Vite react-ts application in apps/web, set its package name to @fleet/web, and replace the template content. Configure jsdom/Testing Library and add semantic behavior tests. Verify the current-state labels remain visible when the historical date range changes, vehicle search/status filters update results, a detail link opens the expected vehicle, and a saved vehicle-status mutation reloads the visible value.

Test stale-request protection with two deferred responses:

```ts
it("keeps the latest date filter result when an earlier request finishes late", async () => {
  const earlier = deferred<Response>();
  const later = deferred<Response>();
  vi.spyOn(globalThis, "fetch")
    .mockReturnValueOnce(earlier.promise)
    .mockReturnValueOnce(later.promise);
  const { rerender, result } = renderHook(({ path }) => useApi<DashboardResponse>(path), {
    initialProps: { path: "/api/dashboard?from=2026-10-01&to=2026-10-01" },
  });
  rerender({ path: "/api/dashboard?from=2026-10-02&to=2026-10-02" });
  later.resolve(Response.json(makeDashboard({ distanceKm: 20 })));
  await waitFor(() => expect(result.current.data?.period.completedDistanceKm).toBe(20));
  earlier.resolve(Response.json(makeDashboard({ distanceKm: 10 })));
  await waitFor(() => expect(result.current.data?.period.completedDistanceKm).toBe(20));
});
```

Define deferred as a promise/resolver helper and makeDashboard as a complete contract-valid fixture with all DashboardResponse fields. Add tests for loading, empty vehicles, and an error panel whose retry action makes a new request.

- [x] **Step 2: Run focused web tests before implementation.** Run `npm run test:web`. Expect missing components/hooks to fail, rather than unrelated test-environment errors.

- [x] **Step 3: Implement typed requests and cancellation.** In useApi, create an AbortController for each request and invalidate the request in effect cleanup. Guard state updates with an active flag so mocked or already-delivered responses cannot overwrite a newer request. Reload increments a request key. apiRequest parses error envelopes and exposes field errors; never turn an unsuccessful response into a successful empty dataset.

```ts
useEffect(() => {
  const controller = new AbortController();
  let active = true;
  setLoading(true);
  setError(null);
  apiRequest<T>(path, { signal: controller.signal })
    .then((value) => { if (active) setData(value); })
    .catch((failure) => { if (active && failure.name !== "AbortError") setError(failure); })
    .finally(() => { if (active) setLoading(false); });
  return () => { active = false; controller.abort(); };
}, [path, reloadKey]);
```

Use Intl.DateTimeFormat with timeZone Asia/Tokyo for timestamps, and Intl.NumberFormat for counts/distances. Show an em dash for null distance with an accessible explanatory label. Configure Vite to proxy `/api` to http://127.0.0.1:3001 and use port 5173.

- [x] **Step 4: Implement the screens and accessible design.** Use the frontend-design skill once implementation prerequisites are approved. Build a consistent shell, three current-state cards, selected-period distance/run totals, Recharts daily/vehicle distance charts, and a searchable sortable vehicle table. Chart values and visible labels come directly from the dashboard response. Display chart zero states clearly.

Vehicle details load /api/vehicles/:id and /api/test-runs?vehicleId=... with the chosen date range. Display run status, distance, driver snapshot, timestamp, and issueCount. Link run issues to `/issues?testRunId=...`. Updating operational status calls PATCH /api/vehicles/:id/status, disables submission while pending, announces success, and reloads details. A missing vehicle gets a meaningful page-level message and a link back to overview.

Use native table semantics, labeled date/search/select fields, accessible button names, textual status labels, keyboard focus styling, and restrained severity colors. At narrow widths, scroll the tables inside their containers rather than the entire page.

- [x] **Step 5: Verify the two-screen deliverable.** Run `npm run test:web` and web typecheck/build. Start API + web with the seeded database, inspect overview and vehicle details at desktop and narrow widths, change filters, retry an intentional temporary API failure, and save a vehicle-status update. Confirm persistence after reload. Commit with `feat: add fleet overview and vehicle detail screens`.

### Task 4: Deliver issue creation, triage, and reopening

**Files:** Create apps/web/src/features/issues/{IssuesPage,IssueForm,IssueFilters}.tsx and their focused tests. Extend shared web components only where these screens need a common behavior.

**Interfaces:**

- Consumes: listIssues, listTestRuns, createIssue, updateIssue, shared issue contracts, apiRequest/useApi.
- Produces: `IssuesPage`, `IssueForm` with create/edit modes, and completed navigation between issues and vehicle details.
- Create mode uses only CreateIssueInput; status updates happen through UpdateIssueInput after creation. A selected vehicle is a UI convenience, not a second persisted foreign key.

- [x] **Step 1: Write failing form and mutation tests.** Test vehicle/run selection, invalid trimmed description, creation, status/severity editing, server field errors, repeated-submit prevention, persistence-facing reload behavior, and reopening a resolved issue. Include this selection regression:

```ts
it("clears the selected run when the vehicle changes", async () => {
  render(<IssueForm mode="create" onSaved={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText("Vehicle"), vehicleA.id);
  await user.selectOptions(await screen.findByLabelText("Test run"), runA.id);
  await user.selectOptions(screen.getByLabelText("Vehicle"), vehicleB.id);
  expect(screen.getByLabelText("Test run")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Create issue" })).toBeDisabled();
});
```

Mock responses that include only the selected vehicle's runs. Assert the outgoing POST body has testRunId, issueType, description, and severity; it does not include vehicleId or server timestamps.

- [x] **Step 2: Run the issue tests before implementation.** Run `npm run test:web -- --testNamePattern="issue|selected run|reopen"`. Expect the new behavior tests to fail for missing implementation.

- [x] **Step 3: Implement the issue list and validated forms.** Initialize filters from URL parameters, reset page when a filter changes, and preserve links back to the affected vehicle. Render status and severity separately. Provide creation/edit controls with labeled fields and keyboard-accessible dialogs or inline forms.

When the vehicle changes, clear testRunId immediately, cancel stale run requests, and load runs for the selected vehicle. Require a selected run from the latest returned page/list before creation. For vehicles with more than one page of runs, provide pagination/search in the run selection instead of silently omitting older runs.

Use createIssueSchema and updateIssueSchema before submitting. Render validation messages next to fields. Preserve form values on request failure. Disable the submit button while pending and set aria-busy. Only close/reset a successful form after the API returns a saved Issue. Reload list/detail state after successful mutations.

The update status options are open, in_progress, and resolved; display readable English labels. Reopening a resolved issue must visibly remove its resolved timestamp after saving. Updating an issue does not automatically update its vehicle status.

- [x] **Step 4: Add and run the core browser test.** Create a Playwright setup that migrates/seeds an isolated test database schema, starts the API and web using that schema, and disposes it afterwards. The test uses accessible names:

```ts
test("a coordinator can resolve an issue and persist a vehicle status change", async ({ page }) => {
  await page.goto("/issues?severity=critical&status=open");
  const unresolvedRow = page.getByRole("row").filter({ hasText: "Seeded critical sensor fault" });
  await unresolvedRow.getByRole("button", { name: "Edit issue" }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("resolved");
  await page.getByRole("button", { name: "Save issue" }).click();
  await expect(page.getByRole("status")).toContainText("Issue saved");
  await page.reload();
  await expect(page.getByText("Issue saved")).not.toBeVisible();
  await page.goto("/issues?status=resolved");
  const issueRow = page.getByRole("row").filter({ hasText: "Seeded critical sensor fault" });
  await expect(issueRow).toContainText("Resolved");
  await issueRow.getByRole("link", { name: /View vehicle/ }).click();
  await page.getByLabel("Operational status").selectOption("maintenance");
  await page.getByRole("button", { name: "Save vehicle status" }).click();
  await page.reload();
  await expect(page.getByLabel("Operational status")).toHaveValue("maintenance");
});
```

Use the deterministic seeded critical issue from Task 1 so the test selects a known record. Add a create-and-reload browser case using a unique English description.

- [x] **Step 5: Verify the complete operational workflow.** Run issue UI tests, API tests, and `npm run test:e2e`. In the browser, exercise creation, validation failure, resolution, reopening, vehicle navigation, and vehicle-status persistence. Inspect desktop and narrow layouts and keyboard navigation. Commit with `feat: add persisted issue management workflow`.

### Task 5: Deliver reproducible setup, bilingual evidence, and CI

**Files:** Add .github templates/workflow, docs/github-workflow.md, docs/demo-walkthrough.md, verified screenshots, Playwright orchestration details, and finalized README/diagrams. Complete production static serving in apps/api/src/app.ts if it is not already configured.

**Interfaces:**

- Consumes: the complete application and verified scripts from Tasks 1–4.
- Produces: verified local setup commands, production same-origin behavior, CI configuration, a complete English/Japanese README, and a clear demo narrative.
- Remote destination remains unspecified. Prepare reviewable local templates and work records; actual GitHub creation/publishing follows once the destination is known and authorized.

- [x] **Step 1: Write a production smoke test before final static-serving behavior.** Build the web/API, start the compiled server, request `/`, a direct `/vehicles/:id` URL, `/api/health`, and an unknown `/api/not-a-route`. Expect HTML for web navigation, readiness JSON for health, and a structured JSON 404 for the unknown API route. Confirm a JavaScript asset referenced by the index resolves successfully.

- [x] **Step 2: Implement production serving and verify it.** Serve apps/web/dist from Express after registered API routes and their 404 handler. Only browser navigation receives index.html fallback. Keep environment configuration on the server. Run the production smoke test and correct any path differences between source and compiled directories.

- [x] **Step 3: Add honest English workflow artifacts and CI.** The Issue template asks for business purpose and acceptance criteria. The PR template asks for resulting behavior, scope, verification, and screenshots when relevant. Record the actual task commits and meaningful review findings in documentation. Do not label self-review as an independent human review.

Configure GitHub Actions for push and pull_request with a PostgreSQL 17 service, health checks, setup-node with Node 24, npm caching, and the following verified command sequence:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Set DATABASE_URL to the CI PostgreSQL service. Database fixtures isolate schemas for the test process. Browser orchestration uses its own schema and explicit application ports; wait for health readiness rather than fixed sleeps. Preserve failure reports/screenshots as workflow artifacts. Pin Actions versions to verified release SHAs when authoring the workflow.

- [x] **Step 4: Finish and verify both README languages.** Replace design-phase labels with actual implementation status only after verification. Add application screenshots, exact prerequisites, the central demo flow, metric semantics, working setup/test commands, ER rationale, and limitations in both English and Japanese. Keep the English/Japanese language switch and static architecture/ER images.

Verify the setup sequence against a fresh local database, preserving the developer's existing database:

```sh
npm ci
cp .env.example .env
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

If the verified local path uses installed PostgreSQL rather than Docker, document both alternatives and identify which was actually tested. Production instructions are `npm run build` followed by `npm start` after migration/seed. Document `npm run db:reset-demo`, its deliberate replacement of saved demo edits, and its isolation from normal startup after verifying the Task 1 guard tests.

Update diagrams to match the shipped component responsibilities and schema. The HTML uses the original architecture-diagram export toolbar and pinned CDN/SRI values. Inspect HTML and static SVG rendering in a browser. Verify README relative links, image targets, Japanese expansion, and metric translation consistency. The existing architecture HTML is a standalone artifact, not a live hosted demo.

- [x] **Step 5: Perform final verification and record limits accurately.** Run the full required checks once after the final changes: typecheck, lint, unit/integration tests, production build, browser workflow tests, and production smoke test. Request the independent code review prescribed by the chosen execution workflow; apply supported findings and rerun the checks affected by fixes. Commit with `docs: add verified setup, Japanese README, and GitHub workflow`.

Do not claim a live deployment, GitHub Issues/PRs, or hosted CI completion unless those actions actually occurred. Keep local completion and external publication status distinct in the handoff.

## Spec coverage and plan self-review

| Approved requirement | Owning task |
| --- | --- |
| English development and Japanese README toggle | Tasks 1–5; final parity check in Task 5 |
| Three screens and central operational workflow | Tasks 3–4 |
| Real PostgreSQL model, constraints, migrations, seed | Task 1 |
| Typed/validated reads, writes, and consistent errors | Tasks 1–2 |
| Date semantics, correct aggregation, zero-filled charts | Tasks 1–3 |
| Persistent issue/vehicle updates and reopening | Tasks 2–4 |
| Loading, empty, retry, accessible/narrow layouts | Tasks 3–4 |
| SQL/model and workflow evidence | Tasks 1, 2, 5 |
| API/browser tests and repeatable verification | Tasks 1–5 |
| Architecture HTML, README SVG, separate ER diagram | Existing artifacts; final Task 5 reconciliation |
| Verified setup, same-origin production serving, CI configuration | Task 5 |

All route names, type names, statuses, metric fields, and date semantics above align with the approved design. The five Review Focus conditions have explicit owning tests. No application feature is deferred within the MVP; maps, streaming, AI, notifications, and authentication remain excluded as approved.

## Execution handoff

Review this written plan before application implementation. Choose Native execution (recommended for this compact shared-contract application) or Subagent-driven execution. Once the plan and execution method are confirmed, resume at Task 1 and use the selected required execution skill.
