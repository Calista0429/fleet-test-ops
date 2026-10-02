import type { Pool } from 'pg';
import { jstToday } from '../packages/contracts/src/dates.js';
import { seedRows } from './seed.js';
import { isDirectRun, runDatabaseCommand } from './cli.js';
export async function resetDemo(pool: Pool, connectionString: string, confirmed: boolean): Promise<void> {
  if(!confirmed) throw new Error('Explicit confirmation is required to reset saved demo data.');
  const url=new URL(connectionString);
  if(url.pathname!=='/fleet_ops') throw new Error('Reset is allowed only for the fleet_ops demo database.');
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('Reset is allowed only on a local host.');
  const client=await pool.connect();
  try {
    const result=await client.query('SELECT current_database() AS database');
    if(result.rows[0].database!=='fleet_ops') throw new Error('The connected database must be fleet_ops.');
    await client.query('BEGIN');
    await client.query('TRUNCATE issues,test_runs,vehicles');
    await seedRows(client,jstToday());
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
if(isDirectRun(import.meta.url)) void runDatabaseCommand(pool=>resetDemo(pool,process.env.DATABASE_URL!,process.argv.includes('--confirm-demo-data-reset')),'Local sample data was reset.');
