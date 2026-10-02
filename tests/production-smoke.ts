import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
const origin = 'http://127.0.0.1:3003';
const child = spawn(process.execPath, ['apps/api/dist/server.js'], {
  env: { ...process.env, PORT: '3003', HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
child.stdout?.on('data', (data) => {
  serverOutput += String(data);
});
child.stderr?.on('data', (data) => {
  serverOutput += String(data);
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (
      await fetch(origin + '/api/health')
        .then((response) => response.status === 200)
        .catch(() => false)
    ) {
      ready = true;
      break;
    }
    if (child.exitCode !== null) throw new Error('Compiled server exited: ' + serverOutput);
    await delay(100);
  }
  assert.ok(ready, 'Compiled server must become ready.');
  const index = await fetch(origin + '/', { headers: { Accept: 'text/html' } });
  assert.equal(index.status, 200, 'Production index must return 200.');
  assert.match(index.headers.get('content-type') ?? '', /text\/html/);
  const html = await index.text();
  assert.match(html, /<title>Fleet Test Operations<\/title>/);
  const navigation = await fetch(origin + '/vehicles/10000000-0000-4000-8000-000000000001', {
    headers: { Accept: 'text/html' },
  });
  assert.equal(navigation.status, 200);
  assert.match(await navigation.text(), /<div id="root"><\/div>/);
  const health = await fetch(origin + '/api/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ready');
  const unknown = await fetch(origin + '/api/not-a-route', { headers: { Accept: 'text/html' } });
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get('content-type') ?? '', /application\/json/);
  assert.equal((await unknown.json()).error.code, 'NOT_FOUND');
  const script = html.match(/src="([^"]+\.js)"/);
  assert.ok(script, 'Index must reference a built JavaScript asset.');
  const asset = await fetch(new URL(script[1]!, origin));
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type') ?? '', /javascript/);
  assert.ok((await asset.text()).length > 100);
  const missing = await fetch(origin + '/assets/missing.js', { headers: { Accept: 'text/html' } });
  assert.equal(missing.status, 404, 'Missing assets must not receive the SPA index.');
  const nonNavigation = await fetch(origin + '/unknown', {
    headers: { Accept: 'application/json' },
  });
  assert.equal(nonNavigation.status, 404, 'Only browser navigation receives the index fallback.');
  console.log(
    'Production smoke: index, direct navigation, API health/404, real asset, missing asset, and non-navigation requests passed.',
  );
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
}
