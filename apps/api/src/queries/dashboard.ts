import type { Pool } from 'pg';
import { jstRange, type DateRange, type DashboardResponse } from '@fleet/contracts';
export async function getDashboard(pool: Pool, range: DateRange): Promise<DashboardResponse> {
  const { start, endExclusive } = jstRange(range.from, range.to);
  const values = [start, endExclusive];
  const [fleet, issues, period, daily, vehicles] = await Promise.all([
    pool.query<{ total: string; available: string }>(
      "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='available') AS available FROM vehicles",
    ),
    pool.query<{ total: string }>(
      "SELECT COUNT(*) AS total FROM issues WHERE status <> 'resolved'",
    ),
    pool.query<{ count: string; distance: string }>(
      "SELECT COUNT(*) AS count, COALESCE(SUM(distance_km),0) AS distance FROM test_runs WHERE status='completed' AND started_at >= $1 AND started_at < $2",
      values,
    ),
    pool.query<{ date: string; distance: string }>(
      "SELECT to_char(started_at AT TIME ZONE 'Asia/Tokyo','YYYY-MM-DD') AS date, SUM(distance_km) AS distance FROM test_runs WHERE status='completed' AND started_at >= $1 AND started_at < $2 GROUP BY 1 ORDER BY 1",
      values,
    ),
    pool.query<{ vehicleId: string; licensePlate: string; distance: string }>(
      `SELECT v.id AS "vehicleId", v.license_plate AS "licensePlate", COALESCE(SUM(r.distance_km),0) AS distance
      FROM vehicles v LEFT JOIN test_runs r ON r.vehicle_id=v.id AND r.status='completed' AND r.started_at >= $1 AND r.started_at < $2
      GROUP BY v.id ORDER BY v.license_plate, v.id`,
      values,
    ),
  ]);
  const distances = new Map(daily.rows.map((row) => [row.date, Number(row.distance)]));
  const distanceByDay: DashboardResponse['distanceByDay'] = [];
  for (
    let day = new Date(range.from + 'T00:00:00Z');
    day <= new Date(range.to + 'T00:00:00Z');
    day = new Date(day.getTime() + 86_400_000)
  ) {
    const date = day.toISOString().slice(0, 10);
    distanceByDay.push({ date, distanceKm: distances.get(date) ?? 0 });
  }
  return {
    range,
    current: {
      vehicleCount: Number(fleet.rows[0]!.total),
      availableVehicleCount: Number(fleet.rows[0]!.available),
      unresolvedIssueCount: Number(issues.rows[0]!.total),
    },
    period: {
      completedRunCount: Number(period.rows[0]!.count),
      completedDistanceKm: Number(period.rows[0]!.distance),
    },
    distanceByDay,
    distanceByVehicle: vehicles.rows.map((row) => ({
      vehicleId: row.vehicleId,
      licensePlate: row.licensePlate,
      distanceKm: Number(row.distance),
    })),
  };
}
