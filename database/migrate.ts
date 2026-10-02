import { readdir, readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { isDirectRun, runDatabaseCommand } from './cli.js';
export async function migrate(pool: Pool): Promise<void> {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext(current_schema() || ':fleet:migrations'))");
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory=new URL('./migrations/',import.meta.url);
    const files=(await readdir(directory)).filter(file=>file.endsWith('.sql')).sort();
    for(const file of files) {
      const applied=await client.query('SELECT version FROM schema_migrations WHERE version=$1',[file]);
      if(applied.rowCount) continue;
      await client.query(await readFile(new URL(file,directory),'utf8'));
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)',[file]);
    }
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
if(isDirectRun(import.meta.url)) void runDatabaseCommand(migrate,'Database migrations are up to date.');
