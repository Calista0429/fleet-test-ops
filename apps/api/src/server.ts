import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createApp } from './app.js';
const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before starting the API.');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: process.env.PGOPTIONS,
  connectionTimeoutMillis: 3000,
  statement_timeout: 10000,
  max: 10,
});
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';
const server = createApp(pool).listen(port, host, () =>
  console.log(`Fleet Operations API ready at http://${host}:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
