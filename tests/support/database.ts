import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../../database/migrate.js';
import { seed } from '../../database/seed.js';
const { Pool } = pg;
export async function createTestDatabase(anchorDate?: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error('DATABASE_URL is required for PostgreSQL integration tests.');
  const schema = 'fleet_test_' + randomUUID().replaceAll('-', '');
  const admin = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 3000 });
  await admin.query('CREATE SCHEMA "' + schema + '"');
  const pool = new Pool({
    connectionString,
    max: 3,
    options: '-c search_path=' + schema,
    connectionTimeoutMillis: 3000,
  });
  try {
    await migrate(pool);
    if (anchorDate) await seed(pool, anchorDate);
  } catch (error) {
    await pool.end();
    await admin.query('DROP SCHEMA "' + schema + '" CASCADE');
    await admin.end();
    throw error;
  }
  return {
    pool,
    schema,
    async dispose() {
      await pool.end();
      await admin.query('DROP SCHEMA "' + schema + '" CASCADE');
      await admin.end();
    },
  };
}
export async function insertVehicle(
  pool: pg.Pool,
  overrides: { status?: string; licensePlate?: string } = {},
) {
  const id = randomUUID();
  await pool.query('INSERT INTO vehicles (id, license_plate, model, status) VALUES ($1,$2,$3,$4)', [
    id,
    overrides.licensePlate ?? 'TEST-' + id.slice(0, 8),
    'Prototype sedan',
    overrides.status ?? 'available',
  ]);
  return { id };
}
export async function insertRun(
  pool: pg.Pool,
  overrides: {
    vehicleId?: string;
    distanceKm?: number | null;
    startedAt?: string;
    endedAt?: string | null;
    status?: string;
  } = {},
) {
  const vehicleId = overrides.vehicleId ?? (await insertVehicle(pool)).id;
  const id = randomUUID();
  const startedAt = overrides.startedAt ?? '2026-10-01T00:00:00Z';
  const endedAt =
    overrides.endedAt === undefined
      ? new Date(new Date(startedAt).getTime() + 3600000).toISOString()
      : overrides.endedAt;
  const distanceKm = overrides.distanceKm === undefined ? 42.5 : overrides.distanceKm;
  await pool.query(
    'INSERT INTO test_runs (id, vehicle_id, driver_name, started_at, ended_at, distance_km, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [
      id,
      vehicleId,
      'Sample Driver',
      startedAt,
      endedAt,
      distanceKm,
      overrides.status ?? 'completed',
    ],
  );
  return { id, vehicleId };
}
export async function insertIssue(
  pool: pg.Pool,
  overrides: {
    testRunId?: string;
    status?: string;
    severity?: string;
    resolvedAt?: string | null;
    description?: string;
    createdAt?: string;
  } = {},
) {
  const testRunId = overrides.testRunId ?? (await insertRun(pool)).id;
  const id = randomUUID();
  await pool.query(
    'INSERT INTO issues (id, test_run_id, issue_type, description, severity, status, created_at, resolved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      id,
      testRunId,
      'sensor_failure',
      overrides.description ?? 'A sensor stopped responding.',
      overrides.severity ?? 'high',
      overrides.status ?? 'open',
      overrides.createdAt ?? '2026-10-01T02:00:00Z',
      overrides.resolvedAt ?? null,
    ],
  );
  return { id, testRunId };
}
