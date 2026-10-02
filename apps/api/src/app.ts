import express from 'express';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { z } from 'zod';
import {
  createIssueSchema,
  updateIssueSchema,
  vehicleStatusSchema,
  uuidSchema,
  dateRangeSchema,
  defaultDateRange,
  vehicleFiltersSchema,
  testRunFiltersSchema,
  issueFiltersSchema,
} from '@fleet/contracts';
import { getDashboard } from './queries/dashboard.js';
import { getVehicle, listVehicles, updateVehicleStatus } from './queries/vehicles.js';
import { listTestRuns } from './queries/runs.js';
import { createIssue, listIssues, updateIssue } from './queries/issues.js';
import { ApiError, errorHandler } from './errors.js';
function required<T>(record: T | null): T {
  if (record === null) throw new ApiError(404, 'NOT_FOUND', 'This record could not be found.');
  return record;
}
export function createApp(pool: Pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch {
      res
        .status(503)
        .json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is not ready.' } });
    }
  });
  app.get('/api/dashboard', async (req, res) => {
    const query = req.query;
    const range =
      query.from === undefined && query.to === undefined
        ? defaultDateRange()
        : dateRangeSchema.parse({ from: query.from, to: query.to });
    res.json(await getDashboard(pool, range));
  });
  app.get('/api/vehicles', async (req, res) => {
    res.json(await listVehicles(pool, vehicleFiltersSchema.parse(req.query)));
  });
  app.get('/api/vehicles/:id', async (req, res) => {
    res.json(required(await getVehicle(pool, uuidSchema.parse(req.params.id))));
  });
  app.patch('/api/vehicles/:id/status', async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const body = z.strictObject({ status: vehicleStatusSchema }).parse(req.body);
    res.json(required(await updateVehicleStatus(pool, id, body.status)));
  });
  app.get('/api/test-runs', async (req, res) => {
    res.json(await listTestRuns(pool, testRunFiltersSchema.parse(req.query)));
  });
  app.get('/api/issues', async (req, res) => {
    res.json(await listIssues(pool, issueFiltersSchema.parse(req.query)));
  });
  app.post('/api/issues', async (req, res) => {
    res.status(201).json(await createIssue(pool, createIssueSchema.parse(req.body)));
  });
  app.patch('/api/issues/:id', async (req, res) => {
    res.json(
      required(
        await updateIssue(pool, uuidSchema.parse(req.params.id), updateIssueSchema.parse(req.body)),
      ),
    );
  });
  app.use('/api', (_req, _res, next) =>
    next(new ApiError(404, 'NOT_FOUND', 'This API route could not be found.')),
  );
  const webDir = fileURLToPath(new URL('../../web/dist/', import.meta.url));
  const index = join(webDir, 'index.html');
  app.use(express.static(webDir, { index: false }));
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      req.get('accept')?.includes('text/html') &&
      extname(req.path) === '' &&
      existsSync(index)
    )
      res.sendFile(index);
    else next();
  });
  app.use((_req, _res, next) =>
    next(new ApiError(404, 'NOT_FOUND', 'This resource could not be found.')),
  );
  app.use(errorHandler);
  return app;
}
