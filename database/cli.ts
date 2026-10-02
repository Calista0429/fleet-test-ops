import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
export function isDirectRun(url: string) {
  return Boolean(process.argv[1] && url === pathToFileURL(process.argv[1]).href);
}
export async function runDatabaseCommand(
  operation: (pool: pg.Pool) => Promise<void>,
  label: string,
) {
  if (existsSync('.env')) process.loadEnvFile('.env');
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env or the environment.');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    max: 5,
  });
  try {
    await operation(pool);
    console.log(label);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Database operation failed.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
