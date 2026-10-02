import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { jstToday } from '@fleet/contracts';
import { createTestDatabase } from '../support/database.js';
if (existsSync('.env')) process.loadEnvFile('.env');
const db = await createTestDatabase(jstToday());
const children: ChildProcess[] = [];
let shuttingDown = false;
async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  await Promise.all(
    children.map((child) =>
      child.exitCode !== null || child.signalCode !== null
        ? Promise.resolve()
        : once(child, 'exit'),
    ),
  );
  await db.dispose();
  await rm('.local/e2e-context.json', { force: true });
  process.exit(code);
}
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    void shutdown();
  });
try {
  await mkdir('.local', { recursive: true });
  await writeFile('.local/e2e-context.json', JSON.stringify({ schema: db.schema }));
  const api = spawn(process.execPath, ['--import', 'tsx', 'apps/api/src/server.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: '3002',
      HOST: '127.0.0.1',
      PGOPTIONS: '-c search_path=' + db.schema,
    },
  });
  children.push(api);
  api.once('exit', () => {
    if (!shuttingDown) void shutdown(1);
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (
      await fetch('http://127.0.0.1:3002/api/health')
        .then((response) => response.ok)
        .catch(() => false)
    ) {
      ready = true;
      break;
    }
    await delay(100);
  }
  if (!ready) throw new Error('The isolated API did not become ready.');
  const web = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      'apps/web',
      '--host',
      '127.0.0.1',
      '--port',
      '5174',
      '--strictPort',
    ],
    { stdio: 'inherit', env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:3002' } },
  );
  children.push(web);
  web.once('exit', () => {
    if (!shuttingDown) void shutdown(1);
  });
  console.log('End-to-end test schema: ' + db.schema);
} catch (error) {
  console.error(error);
  await shutdown(1);
}
