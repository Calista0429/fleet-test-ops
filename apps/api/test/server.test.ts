import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import pg from 'pg';

describe('server database recovery', () => {
  it('stays running after an idle connection fails and serves a later request', async () => {
    const applicationName = 'fleet_recovery_' + randomUUID();
    const connection = new URL(process.env.DATABASE_URL!);
    connection.searchParams.set('application_name', applicationName);
    const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const child = spawn(process.execPath, ['--import', 'tsx', 'apps/api/src/server.ts'], {
      env: { ...process.env, DATABASE_URL: connection.href, PORT: '3005', HOST: '127.0.0.1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (data) => (output += String(data)));
    child.stderr.on('data', (data) => (output += String(data)));
    const health = () =>
      fetch('http://127.0.0.1:3005/api/health')
        .then((response) => response.status)
        .catch(() => 0);
    try {
      await expect.poll(health, { timeout: 5000 }).toBe(200);
      const idle = await admin.query(
        "SELECT pid FROM pg_stat_activity WHERE application_name=$1 AND state='idle'",
        [applicationName],
      );
      expect(idle.rows).toHaveLength(1);
      // Terminate only this child server's idle session; do not restart the shared database.
      expect(
        (await admin.query('SELECT pg_terminate_backend($1) AS terminated', [idle.rows[0].pid]))
          .rows[0].terminated,
      ).toBe(true);
      await expect
        .poll(() => output)
        .toContain('terminating connection due to administrator command');
      await expect.poll(health, { timeout: 2000 }).toBe(200);
      expect(child.exitCode).toBeNull();
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGTERM');
        await exited;
      }
      await admin.end();
    }
  });
});
