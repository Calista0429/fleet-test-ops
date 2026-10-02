import { z } from 'zod';
import { calendarDateSchema } from './dates.js';
export * from './dates.js';
export const vehicleStatusSchema = z.enum(['available','testing','maintenance']);
export const issueStatusSchema = z.enum(['open','in_progress','resolved']);
export const severitySchema = z.enum(['low','medium','high','critical']);
export const issueTypeSchema = z.enum(['sensor_failure','software_crash','other']);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;
export type IssueStatus = z.infer<typeof issueStatusSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type IssueType = z.infer<typeof issueTypeSchema>;
export const uuidSchema = z.uuid();
const description = z.string().trim().min(10,'Describe the issue in at least 10 characters.').max(2000);
export const createIssueSchema = z.strictObject({ testRunId:uuidSchema, issueType:issueTypeSchema, description, severity:severitySchema });
export const updateIssueSchema = z.strictObject({ description:description.optional(), severity:severitySchema.optional(), status:issueStatusSchema.optional() }).refine(value => Object.values(value).some(item=>item!==undefined),'Choose at least one field to update.');
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
const integer = z.union([z.string().regex(/^\d+$/),z.number()]).pipe(z.coerce.number<string | number>().int().min(1).max(Number.MAX_SAFE_INTEGER));
export const paginationSchema = z.object({ page:integer.default(1), pageSize:integer.pipe(z.number().max(100)).default(20) });
export interface Page<T> { items:T[]; page:number; pageSize:number; total:number }
const timestamp=z.iso.datetime();
export const vehicleSchema=z.object({ id:uuidSchema, licensePlate:z.string(), model:z.string(), status:vehicleStatusSchema, createdAt:timestamp, updatedAt:timestamp });
export type Vehicle=z.infer<typeof vehicleSchema>;
export const testRunSchema=z.object({ id:uuidSchema, vehicleId:uuidSchema, driverName:z.string(), startedAt:timestamp, endedAt:timestamp.nullable(), distanceKm:z.number().nonnegative().nullable(), status:z.enum(['in_progress','completed','cancelled']), issueCount:z.number().int().nonnegative() });
export type TestRun=z.infer<typeof testRunSchema>;
export const issueSchema=z.object({ id:uuidSchema, testRunId:uuidSchema, vehicleId:uuidSchema, licensePlate:z.string(), runStartedAt:timestamp, issueType:issueTypeSchema, description:z.string(), severity:severitySchema, status:issueStatusSchema, createdAt:timestamp, updatedAt:timestamp, resolvedAt:timestamp.nullable() });
export type Issue=z.infer<typeof issueSchema>;
export const dashboardResponseSchema=z.object({
  range:z.object({from:calendarDateSchema,to:calendarDateSchema}),
  current:z.object({vehicleCount:z.number().int().nonnegative(),availableVehicleCount:z.number().int().nonnegative(),unresolvedIssueCount:z.number().int().nonnegative()}),
  period:z.object({completedRunCount:z.number().int().nonnegative(),completedDistanceKm:z.number().nonnegative()}),
  distanceByDay:z.array(z.object({date:calendarDateSchema,distanceKm:z.number().nonnegative()})),
  distanceByVehicle:z.array(z.object({vehicleId:uuidSchema,licensePlate:z.string(),distanceKm:z.number().nonnegative()})),
});
export type DashboardResponse=z.infer<typeof dashboardResponseSchema>;
export interface ApiErrorBody { error:{code:string;message:string;fieldErrors?:Record<string,string[]>} }
export const vehicleFiltersSchema=paginationSchema.extend({ search:z.string().trim().max(100).optional(),status:vehicleStatusSchema.optional(),sort:z.enum(['licensePlate','model','status']).default('licensePlate'),direction:z.enum(['asc','desc']).default('asc') });
export type VehicleFilters=z.infer<typeof vehicleFiltersSchema>;
export const testRunFiltersSchema=paginationSchema.extend({vehicleId:uuidSchema,from:calendarDateSchema.optional(),to:calendarDateSchema.optional()}).refine(value=> (!value.from&&!value.to)||Boolean(value.from&&value.to&&value.from<=value.to),{path:['to'],message:'Supply a valid start and end date together.'});
export type TestRunFilters=z.infer<typeof testRunFiltersSchema>;
export const issueFiltersSchema=paginationSchema.extend({vehicleId:uuidSchema.optional(),testRunId:uuidSchema.optional(),severity:severitySchema.optional(),status:issueStatusSchema.optional()});
export type IssueFilters=z.infer<typeof issueFiltersSchema>;
