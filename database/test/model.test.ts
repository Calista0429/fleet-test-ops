import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  createTestDatabase,
  insertVehicle,
  insertRun,
  insertIssue,
} from '../../tests/support/database.js';
import { migrate } from '../migrate.js';
import { seed } from '../seed.js';
import { resetDemo } from '../reset-demo.js';
const databases: Awaited<ReturnType<typeof createTestDatabase>>[] = [];
async function fresh() {
  const db = await createTestDatabase();
  databases.push(db);
  return db.pool;
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.dispose()));
});
describe('PostgreSQL model', () => {
  it('creates the three business tables', async () => {
    const pool = await fresh();
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('vehicles','test_runs','issues') ORDER BY table_name",
    );
    expect(result.rows.map((row) => row.table_name)).toEqual(['issues', 'test_runs', 'vehicles']);
  });
  it('preserves records when migrations run again', async () => {
    const pool = await fresh();
    const vehicle = await insertVehicle(pool);
    await migrate(pool);
    expect((await pool.query('SELECT id FROM vehicles')).rows).toEqual([{ id: vehicle.id }]);
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM schema_migrations')).rows[0].count,
    ).toBe(1);
  });
  it('rejects duplicate license plates', async () => {
    const pool = await fresh();
    await insertVehicle(pool, { licensePlate: 'TEST-001' });
    await expect(insertVehicle(pool, { licensePlate: 'TEST-001' })).rejects.toMatchObject({
      code: '23505',
    });
  });
  it('rejects a run linked to a missing vehicle', async () => {
    const pool = await fresh();
    await expect(insertRun(pool, { vehicleId: randomUUID() })).rejects.toMatchObject({
      code: '23503',
    });
  });
  it('rejects an issue linked to a missing run', async () => {
    const pool = await fresh();
    await expect(insertIssue(pool, { testRunId: randomUUID() })).rejects.toMatchObject({
      code: '23503',
    });
  });
  it.each([
    { distanceKm: -1 },
    { endedAt: '2026-09-30T23:00:00Z' },
    { endedAt: null },
    { distanceKm: null },
    { status: 'unknown' },
  ])('rejects an invalid completed run %j', async (values) => {
    const pool = await fresh();
    const vehicle = await insertVehicle(pool);
    await expect(insertRun(pool, { ...values, vehicleId: vehicle.id })).rejects.toMatchObject({
      code: '23514',
    });
  });
  it('accepts an in-progress run with no end or distance', async () => {
    const pool = await fresh();
    const run = await insertRun(pool, { status: 'in_progress', endedAt: null, distanceKm: null });
    expect(
      (await pool.query('SELECT ended_at, distance_km FROM test_runs WHERE id=$1', [run.id]))
        .rows[0],
    ).toEqual({ ended_at: null, distance_km: null });
  });
  it.each([
    { status: 'resolved', resolvedAt: null },
    { status: 'open', resolvedAt: '2026-10-01T03:00:00Z' },
    { status: 'resolved', resolvedAt: '2026-09-30T01:00:00Z' },
  ])('rejects inconsistent resolution state %j', async (values) => {
    const pool = await fresh();
    const run = await insertRun(pool);
    await expect(insertIssue(pool, { ...values, testRunId: run.id })).rejects.toMatchObject({
      code: '23514',
    });
  });
  it('retains historical parents referenced by test runs', async () => {
    const pool = await fresh();
    const run = await insertRun(pool);
    await expect(
      pool.query('DELETE FROM vehicles WHERE id=$1', [run.vehicleId]),
    ).rejects.toMatchObject({ code: '23503' });
  });
  it('seeds exactly 8 vehicles, 60 runs, and 24 issues without duplicates', async () => {
    const pool = await fresh();
    await seed(pool, '2026-10-02');
    await seed(pool, '2026-10-02');
    const result = await pool.query(
      'SELECT (SELECT count(*)::int FROM vehicles) AS vehicles, (SELECT count(*)::int FROM test_runs) AS runs, (SELECT count(*)::int FROM issues) AS issues',
    );
    expect(result.rows[0]).toEqual({ vehicles: 8, runs: 60, issues: 24 });
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS count FROM vehicles v WHERE NOT EXISTS (SELECT 1 FROM test_runs r WHERE r.vehicle_id=v.id)',
        )
      ).rows[0].count,
    ).toBeGreaterThan(0);
  });
  it('provides one uniquely identifiable critical demo incident', async () => {
    const pool = await fresh();
    await seed(pool, '2026-10-02');
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS count FROM issues WHERE description='Seeded critical sensor fault'",
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it('preserves edited sample data when seeding again', async () => {
    const pool = await fresh();
    await seed(pool, '2026-10-02');
    await pool.query("UPDATE vehicles SET model='Coordinator edit'");
    await seed(pool, '2026-10-03');
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS count FROM vehicles WHERE model='Coordinator edit'",
        )
      ).rows[0].count,
    ).toBe(8);
  });
  it('refuses reset without explicit confirmation', async () => {
    const pool = await fresh();
    await expect(resetDemo(pool, process.env.DATABASE_URL!, false)).rejects.toThrow(/confirm/i);
  });
  it('refuses reset for a non-demo database', async () => {
    const pool = await fresh();
    await expect(
      resetDemo(pool, 'postgresql://fleet:password@127.0.0.1:5433/company_data', true),
    ).rejects.toThrow(/fleet_ops/i);
  });
  it('refuses reset on a remote host', async () => {
    const pool = await fresh();
    await expect(
      resetDemo(pool, 'postgresql://fleet:password@company.example/fleet_ops', true),
    ).rejects.toThrow(/local/i);
  });
  it('resets only the business tables and retains migration history', async () => {
    const pool = await fresh();
    await insertVehicle(pool, { licensePlate: 'EXTRA-001' });
    await resetDemo(pool, process.env.DATABASE_URL!, true);
    expect((await pool.query('SELECT count(*)::int AS count FROM vehicles')).rows[0].count).toBe(8);
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM schema_migrations')).rows[0].count,
    ).toBe(1);
  });
});
