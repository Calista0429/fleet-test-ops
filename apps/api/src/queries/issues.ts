import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Issue, IssueFilters, Page, CreateIssueInput, UpdateIssueInput } from '@fleet/contracts';
import { ApiError } from '../errors.js';
type IssueRow=Omit<Issue,'runStartedAt'|'createdAt'|'updatedAt'|'resolvedAt'> & {runStartedAt:Date;createdAt:Date;updatedAt:Date;resolvedAt:Date|null};
const fields='i.id, i.test_run_id AS "testRunId", r.vehicle_id AS "vehicleId", v.license_plate AS "licensePlate", r.started_at AS "runStartedAt", i.issue_type AS "issueType", i.description, i.severity, i.status, i.created_at AS "createdAt", i.updated_at AS "updatedAt", i.resolved_at AS "resolvedAt"';
const joins='FROM issues i JOIN test_runs r ON r.id=i.test_run_id JOIN vehicles v ON v.id=r.vehicle_id';
function issue(row:IssueRow):Issue {return {...row,runStartedAt:row.runStartedAt.toISOString(),createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),resolvedAt:row.resolvedAt?.toISOString()??null};}
async function getIssue(pool:Pool,id:string):Promise<Issue|null> {const rows=await pool.query<IssueRow>(`SELECT ${fields} ${joins} WHERE i.id=$1`,[id]);return rows.rows[0]?issue(rows.rows[0]):null;}
export async function listIssues(pool:Pool,filters:IssueFilters):Promise<Page<Issue>> {
  const values:unknown[]=[]; const clauses:string[]=[];
  for(const [key,column] of [['vehicleId','r.vehicle_id'],['testRunId','i.test_run_id'],['severity','i.severity'],['status','i.status']] as const) if(filters[key]){values.push(filters[key]);clauses.push(`${column}=$${values.length}`);}
  const where=clauses.length?'WHERE '+clauses.join(' AND '):'';
  const count=await pool.query<{total:string}>(`SELECT COUNT(*) AS total ${joins} ${where}`,values);
  const rows=await pool.query<IssueRow>(`SELECT ${fields} ${joins} ${where} ORDER BY i.created_at DESC, i.id ASC LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,filters.pageSize,(filters.page-1)*filters.pageSize]);
  return {items:rows.rows.map(issue),total:Number(count.rows[0]!.total),page:filters.page,pageSize:filters.pageSize};
}
export async function createIssue(pool:Pool,input:CreateIssueInput):Promise<Issue> {
  const id=randomUUID();
  try {await pool.query("INSERT INTO issues (id,test_run_id,issue_type,description,severity,status) VALUES ($1,$2,$3,$4,$5,'open')",[id,input.testRunId,input.issueType,input.description,input.severity]);}
  catch(error) {if(typeof error==='object'&&error!==null&&'code' in error&&error.code==='23503')throw new ApiError(400,'VALIDATION_ERROR','Choose an existing test run.',{testRunId:['This test run no longer exists.']});throw error;}
  return (await getIssue(pool,id))!;
}
export async function updateIssue(pool:Pool,id:string,input:UpdateIssueInput):Promise<Issue|null> {
  const result=await pool.query(`UPDATE issues SET description=COALESCE($2,description), severity=COALESCE($3,severity), status=COALESCE($4,status),
    resolved_at=CASE WHEN COALESCE($4,status)='resolved' THEN COALESCE(resolved_at,now()) ELSE NULL END, updated_at=now() WHERE id=$1 RETURNING id`,[id,input.description??null,input.severity??null,input.status??null]);
  return result.rowCount?getIssue(pool,id):null;
}
