import type { Pool } from 'pg';
import { jstRange, type TestRun, type TestRunFilters, type Page } from '@fleet/contracts';
type RunRow = Omit<TestRun, 'startedAt' | 'endedAt' | 'distanceKm' | 'issueCount'> & {
  startedAt: Date;
  endedAt: Date | null;
  distanceKm: string | null;
  issueCount: string;
};
export async function listTestRuns(pool: Pool, filters: TestRunFilters): Promise<Page<TestRun>> {
  const values: unknown[] = [filters.vehicleId];
  let where = 'WHERE r.vehicle_id=$1';
  if (filters.from && filters.to) {
    const range = jstRange(filters.from, filters.to);
    values.push(range.start, range.endExclusive);
    where += ' AND r.started_at >= $2 AND r.started_at < $3';
  }
  const count = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM test_runs r ${where}`,
    values,
  );
  const rows = await pool.query<RunRow>(
    `SELECT r.id, r.vehicle_id AS "vehicleId", r.driver_name AS "driverName", r.started_at AS "startedAt", r.ended_at AS "endedAt", r.distance_km AS "distanceKm", r.status, COALESCE(i.total,0) AS "issueCount"
    FROM test_runs r LEFT JOIN (SELECT test_run_id, COUNT(*) AS total FROM issues GROUP BY test_run_id) i ON i.test_run_id=r.id
    ${where} ORDER BY r.started_at DESC, r.id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, filters.pageSize, (filters.page - 1) * filters.pageSize],
  );
  return {
    items: rows.rows.map((row) => ({
      ...row,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      distanceKm: row.distanceKm === null ? null : Number(row.distanceKm),
      issueCount: Number(row.issueCount),
    })),
    total: Number(count.rows[0]!.total),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}
