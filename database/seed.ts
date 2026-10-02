import type { Pool, PoolClient } from 'pg';
import { jstToday, calendarDateSchema } from '../packages/contracts/src/dates.js';
import { isDirectRun, runDatabaseCommand } from './cli.js';
function sampleId(group: string, index: number) {
  return group + '-0000-4000-8000-' + String(index + 1).padStart(12, '0');
}
export async function seedRows(client: PoolClient, anchorDate: string): Promise<void> {
  calendarDateSchema.parse(anchorDate);
  const anchor = new Date(anchorDate + 'T00:00:00+09:00').getTime();
  const models = [
    'Prototype Sedan A',
    'Prototype SUV B',
    'Hybrid Test Mule C',
    'Electric Platform D',
    'Compact Prototype E',
    'Validation Van F',
    'Prototype Sedan G',
    'Reserve Vehicle H',
  ];
  const states = [
    'available',
    'testing',
    'available',
    'maintenance',
    'available',
    'testing',
    'available',
    'available',
  ];
  for (let i = 0; i < 8; i++)
    await client.query(
      'INSERT INTO vehicles (id,license_plate,model,status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [sampleId('10000000', i), 'TEST-JP-' + String(i + 1).padStart(3, '0'), models[i], states[i]],
    );
  const starts: string[] = [];
  for (let i = 0; i < 60; i++) {
    const start = new Date(
      anchor - (19 - Math.floor(i / 3)) * 86400000 + (9 + (i % 3) * 2) * 3600000,
    ).toISOString();
    starts.push(start);
    const status =
      i >= 58 || i % 17 === 0 ? 'in_progress' : i % 13 === 0 ? 'cancelled' : 'completed';
    const end =
      status === 'in_progress'
        ? null
        : new Date(new Date(start).getTime() + (2 + (i % 3)) * 3600000).toISOString();
    const distance =
      status === 'in_progress' ? null : Math.round((38 + ((i * 17) % 118) + i / 10) * 100) / 100;
    await client.query(
      'INSERT INTO test_runs (id,vehicle_id,driver_name,started_at,ended_at,distance_km,status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
      [
        sampleId('20000000', i),
        sampleId('10000000', i % 7),
        ['A. Mori', 'K. Sato', 'Y. Tanaka', 'M. Aoki'][i % 4],
        start,
        end,
        distance,
        status,
      ],
    );
  }
  const descriptions = [
    'Seeded critical sensor fault',
    'Camera feed interrupted during the route.',
    'Unexpected software restart during a test.',
    'Intermittent radar connection needs inspection.',
    'Time synchronization drift observed in logs.',
    'Diagnostic warning recorded after vehicle startup.',
  ];
  for (let i = 0; i < 24; i++) {
    const runIndex = i === 1 ? 0 : (i * 2) % 50;
    const created = new Date(new Date(starts[runIndex]!).getTime() + 1800000).toISOString();
    const status = ['open', 'in_progress', 'resolved'][i % 3];
    const resolved =
      status === 'resolved' ? new Date(new Date(created).getTime() + 7200000).toISOString() : null;
    await client.query(
      'INSERT INTO issues (id,test_run_id,issue_type,description,severity,status,created_at,updated_at,resolved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',
      [
        sampleId('30000000', i),
        sampleId('20000000', runIndex),
        ['sensor_failure', 'software_crash', 'other'][i % 3],
        i === 0 ? descriptions[0] : descriptions[1 + (i % (descriptions.length - 1))],
        ['critical', 'high', 'medium', 'low'][i % 4],
        status,
        created,
        resolved ?? created,
        resolved,
      ],
    );
  }
}
export async function seed(pool: Pool, anchorDate: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedRows(client, anchorDate);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
if (isDirectRun(import.meta.url))
  void runDatabaseCommand(
    (pool) => seed(pool, jstToday()),
    'Sample data is ready (8 vehicles, 60 runs, 24 issues). Existing edits were preserved.',
  );
