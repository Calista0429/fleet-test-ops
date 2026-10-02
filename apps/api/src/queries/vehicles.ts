import type { Pool } from 'pg';
import type { Vehicle, VehicleFilters, VehicleStatus, Page } from '@fleet/contracts';
type VehicleRow = Omit<Vehicle,'createdAt'|'updatedAt'> & { createdAt: Date; updatedAt: Date };
const fields = 'id, license_plate AS "licensePlate", model, status, created_at AS "createdAt", updated_at AS "updatedAt"';
function vehicle(row: VehicleRow): Vehicle { return {...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()}; }
export async function listVehicles(pool: Pool, filters: VehicleFilters): Promise<Page<Vehicle>> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (filters.search) { params.push('%'+filters.search+'%'); clauses.push(`(license_plate ILIKE $${params.length} OR model ILIKE $${params.length})`); }
  if (filters.status) { params.push(filters.status); clauses.push(`status=$${params.length}`); }
  const where = clauses.length ? 'WHERE '+clauses.join(' AND ') : '';
  const total = await pool.query<{total:string}>(`SELECT COUNT(*) AS total FROM vehicles ${where}`, params);
  const sort = {licensePlate:'license_plate',model:'model',status:'status'}[filters.sort];
  const direction = filters.direction === 'desc' ? 'DESC' : 'ASC';
  const rows = await pool.query<VehicleRow>(`SELECT ${fields} FROM vehicles ${where} ORDER BY ${sort} ${direction}, id ASC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, filters.pageSize, (filters.page-1)*filters.pageSize]);
  return {items:rows.rows.map(vehicle),page:filters.page,pageSize:filters.pageSize,total:Number(total.rows[0]!.total)};
}
export async function getVehicle(pool: Pool, id: string): Promise<Vehicle|null> {
  const result = await pool.query<VehicleRow>(`SELECT ${fields} FROM vehicles WHERE id=$1`,[id]);
  return result.rows[0] ? vehicle(result.rows[0]) : null;
}
export async function updateVehicleStatus(pool: Pool, id: string, status: VehicleStatus): Promise<Vehicle|null> {
  const result = await pool.query<VehicleRow>(`UPDATE vehicles SET status=$2, updated_at=now() WHERE id=$1 RETURNING ${fields}`,[id,status]);
  return result.rows[0] ? vehicle(result.rows[0]) : null;
}
