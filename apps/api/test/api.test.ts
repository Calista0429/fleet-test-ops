import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { dashboardResponseSchema, issueSchema, vehicleSchema } from '@fleet/contracts';
import { createApp } from '../src/app.js';
import { createTestDatabase, insertVehicle, insertRun, insertIssue } from '../../../tests/support/database.js';
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof createApp>;
beforeEach(async()=> { db=await createTestDatabase(); app=createApp(db.pool); });
afterEach(async()=> { await db.dispose(); });
describe('operational API',()=> {
  it('reports database readiness',async()=> { const r=await request(app).get('/api/health');expect(r.status).toBe(200);expect(r.body.status).toBe('ready'); });
  it('returns 503 when the database cannot be reached',async()=> {
    const unavailable=new pg.Pool({connectionString:'postgresql://fleet:password@127.0.0.1:1/fleet_ops',connectionTimeoutMillis:100,max:1});
    try { const r=await request(createApp(unavailable)).get('/api/health');expect(r.status).toBe(503);expect(r.body.error.code).toBe('DATABASE_UNAVAILABLE'); } finally { await unavailable.end(); }
  });
  it('does not multiply distance when a run has several issues',async()=> {
    const run=await insertRun(db.pool,{distanceKm:42.5});await insertIssue(db.pool,{testRunId:run.id});await insertIssue(db.pool,{testRunId:run.id});
    const r=await request(app).get('/api/dashboard?from=2026-10-01&to=2026-10-01');expect(r.status).toBe(200);expect(r.body.period).toEqual({completedRunCount:1,completedDistanceKm:42.5});expect(dashboardResponseSchema.safeParse(r.body).success).toBe(true);
  });
  it('counts the inclusive JST start and excludes the next midnight',async()=> {
    for(const [startedAt,distanceKm] of [['2026-09-30T14:59:59.999Z',100],['2026-09-30T15:00:00.000Z',10],['2026-10-01T14:59:59.999Z',20],['2026-10-01T15:00:00.000Z',200]] as const) await insertRun(db.pool,{startedAt,distanceKm});
    const r=await request(app).get('/api/dashboard?from=2026-10-01&to=2026-10-01');expect(r.status).toBe(200);expect(r.body.period).toEqual({completedRunCount:2,completedDistanceKm:30});
  });
  it('fills days with no completed runs with zero',async()=> {
    const r=await request(app).get('/api/dashboard?from=2026-10-01&to=2026-10-02');expect(r.status).toBe(200);expect(r.body.distanceByDay).toEqual([{date:'2026-10-01',distanceKm:0},{date:'2026-10-02',distanceKm:0}]);
  });
  it('excludes cancelled and in-progress runs from completed distance',async()=> {
    await insertRun(db.pool,{status:'cancelled',distanceKm:100});await insertRun(db.pool,{status:'in_progress',endedAt:null,distanceKm:null});await insertRun(db.pool,{distanceKm:15});
    const r=await request(app).get('/api/dashboard?from=2026-10-01&to=2026-10-01');expect(r.status).toBe(200);expect(r.body.period.completedDistanceKm).toBe(15);
  });
  it('keeps zero-run vehicles and current fleet state independent of date filters',async()=> {
    await insertVehicle(db.pool,{status:'available',licensePlate:'RESERVE-001'});await insertVehicle(db.pool,{status:'maintenance'});await insertIssue(db.pool);
    const a=await request(app).get('/api/dashboard?from=2026-10-01&to=2026-10-01');const b=await request(app).get('/api/dashboard?from=2025-01-01&to=2025-01-02');
    expect(a.status).toBe(200);expect(b.status).toBe(200);expect(a.body.current).toEqual({vehicleCount:3,availableVehicleCount:2,unresolvedIssueCount:1});expect(b.body.current).toEqual(a.body.current);expect(a.body.distanceByVehicle.find((v:{licensePlate:string})=>v.licensePlate==='RESERVE-001').distanceKm).toBe(0);
  });
  it.each(['from=2026-02-30&to=2026-03-01','from=2026-10-02&to=2026-10-01','from=2026-10-01'])('rejects invalid date input %s',async query=> {const r=await request(app).get('/api/dashboard?'+query);expect(r.status).toBe(400);expect(r.body.error.code).toBe('VALIDATION_ERROR');});
  it('provides a validated default date range',async()=> {const r=await request(app).get('/api/dashboard');expect(r.status).toBe(200);expect(dashboardResponseSchema.safeParse(r.body).success).toBe(true);expect(r.body.distanceByDay).toHaveLength(7);});
  it('filters vehicles and keeps pagination totals aligned',async()=> {
    await insertVehicle(db.pool,{licensePlate:'SEARCH-001',status:'available'});await insertVehicle(db.pool,{licensePlate:'SEARCH-002',status:'maintenance'});await insertVehicle(db.pool,{licensePlate:'OTHER-003'});
    const r=await request(app).get('/api/vehicles?search=SEARCH&status=available&pageSize=1');expect(r.status).toBe(200);expect(r.body.total).toBe(1);expect(r.body.items[0].licensePlate).toBe('SEARCH-001');expect(vehicleSchema.safeParse(r.body.items[0]).success).toBe(true);
  });
  it('paginates deterministically when sort values tie',async()=> {
    for(let i=0;i<3;i++) await insertVehicle(db.pool);
    const pages=[];for(let page=1;page<=3;page++){const r=await request(app).get('/api/vehicles?sort=model&pageSize=1&page='+page);expect(r.status).toBe(200);pages.push(r.body.items[0].id);expect(r.body.total).toBe(3);}
    expect(new Set(pages).size).toBe(3);
  });
  it.each(['sort=unsafe_column','page=-1','status=invalid','pageSize=101'])('rejects invalid vehicle filter %s',async query=>{expect((await request(app).get('/api/vehicles?'+query)).status).toBe(400);});
  it('returns 404 for missing vehicles and 400 for malformed identifiers',async()=> {expect((await request(app).get('/api/vehicles/'+randomUUID())).status).toBe(404);expect((await request(app).get('/api/vehicles/not-a-uuid')).status).toBe(400);});
  it('persists an operational-status update',async()=> {
    const v=await insertVehicle(db.pool);const r=await request(app).patch('/api/vehicles/'+v.id+'/status').send({status:'maintenance'});expect(r.status).toBe(200);expect(r.body.status).toBe('maintenance');expect((await db.pool.query('SELECT status FROM vehicles WHERE id=$1',[v.id])).rows[0].status).toBe('maintenance');
  });
  it('rejects an invalid operational-status mutation',async()=> {const v=await insertVehicle(db.pool);expect((await request(app).patch('/api/vehicles/'+v.id+'/status').send({status:'healthy'})).status).toBe(400);});
  it('lists vehicle runs with correct linked issue counts',async()=> {
    const run=await insertRun(db.pool);await insertIssue(db.pool,{testRunId:run.id});await insertIssue(db.pool,{testRunId:run.id});
    const r=await request(app).get('/api/test-runs?vehicleId='+run.vehicleId+'&from=2026-10-01&to=2026-10-01');expect(r.status).toBe(200);expect(r.body.total).toBe(1);expect(r.body.items[0].issueCount).toBe(2);expect(r.body.items[0].distanceKm).toBe(42.5);
  });
  it('creates an issue linked to its actual vehicle and persists it',async()=> {
    const run=await insertRun(db.pool);const r=await request(app).post('/api/issues').send({testRunId:run.id,issueType:'sensor_failure',description:'Camera connection failed during the run.',severity:'high'});
    expect(r.status).toBe(201);expect(issueSchema.safeParse(r.body).success).toBe(true);expect(r.body.vehicleId).toBe(run.vehicleId);expect(r.body.status).toBe('open');expect((await db.pool.query('SELECT test_run_id FROM issues WHERE id=$1',[r.body.id])).rows[0].test_run_id).toBe(run.id);
  });
  it('returns a field error for a missing run on creation',async()=> {const r=await request(app).post('/api/issues').send({testRunId:randomUUID(),issueType:'other',description:'A sufficiently detailed issue.',severity:'low'});expect(r.status).toBe(400);expect(r.body.error.fieldErrors.testRunId).toBeDefined();});
  it('rejects invalid issue descriptions and unknown fields',async()=> {
    const run=await insertRun(db.pool);const body={testRunId:run.id,issueType:'other',description:'short',severity:'low'};
    expect((await request(app).post('/api/issues').send(body)).status).toBe(400);expect((await request(app).post('/api/issues').send({...body,description:'A sufficiently detailed issue.',vehicleId:run.vehicleId})).status).toBe(400);
  });
  it('resolves an issue with a server-owned timestamp and preserves it on edits',async()=> {
    const issue=await insertIssue(db.pool);const resolved=await request(app).patch('/api/issues/'+issue.id).send({status:'resolved'});expect(resolved.status).toBe(200);expect(resolved.body.resolvedAt).not.toBeNull();
    const edited=await request(app).patch('/api/issues/'+issue.id).send({description:'Updated diagnostic findings after inspection.'});expect(edited.status).toBe(200);expect(edited.body.resolvedAt).toBe(resolved.body.resolvedAt);
  });
  it('clears the persisted resolution timestamp when reopening',async()=> {
    const issue=await insertIssue(db.pool,{status:'resolved',resolvedAt:'2026-10-01T03:00:00Z'});const r=await request(app).patch('/api/issues/'+issue.id).send({status:'open'});expect(r.status).toBe(200);expect(r.body.resolvedAt).toBeNull();expect((await db.pool.query('SELECT resolved_at FROM issues WHERE id=$1',[issue.id])).rows[0].resolved_at).toBeNull();
  });
  it('filters issues through their run without duplicating vehicle identity',async()=> {
    const a=await insertRun(db.pool);const b=await insertRun(db.pool);await insertIssue(db.pool,{testRunId:a.id,severity:'critical'});await insertIssue(db.pool,{testRunId:b.id});
    const r=await request(app).get('/api/issues?vehicleId='+a.vehicleId+'&severity=critical&status=open');expect(r.status).toBe(200);expect(r.body.total).toBe(1);expect(r.body.items[0].vehicleId).toBe(a.vehicleId);
  });
  it('returns 404 for missing mutation targets',async()=> {expect((await request(app).patch('/api/issues/'+randomUUID()).send({status:'open'})).status).toBe(404);expect((await request(app).patch('/api/vehicles/'+randomUUID()+'/status').send({status:'testing'})).status).toBe(404);});
  it('returns a structured 400 for malformed JSON',async()=> {const r=await request(app).post('/api/issues').set('Content-Type','application/json').send('{');expect(r.status).toBe(400);expect(r.body.error.code).toBe('INVALID_JSON');});
  it('returns a JSON 404 for unknown API routes',async()=> {const r=await request(app).get('/api/not-a-route');expect(r.status).toBe(404);expect(r.body.error.code).toBe('NOT_FOUND');});
});
