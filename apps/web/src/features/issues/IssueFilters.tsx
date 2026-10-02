import { issueStatusSchema, severitySchema, type Vehicle } from '@fleet/contracts';
import { titleCase } from '../../lib/format';
export function IssueFilters({
  values,
  vehicles,
  vehicleOptionsUnavailable,
  onChange,
}: {
  values: { vehicleId: string; severity: string; status: string };
  vehicles: Vehicle[];
  vehicleOptionsUnavailable: boolean;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="filter-row issue-filters">
      <label>
        Filter vehicle
        <select
          value={values.vehicleId}
          disabled={vehicleOptionsUnavailable}
          onChange={(event) => onChange('vehicleId', event.target.value)}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option value={v.id} key={v.id}>
              {v.licensePlate}
            </option>
          ))}
        </select>
      </label>
      <label>
        Filter severity
        <select
          value={values.severity}
          onChange={(event) => onChange('severity', event.target.value)}
        >
          <option value="">All severities</option>
          {severitySchema.options.map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Filter status
        <select value={values.status} onChange={(event) => onChange('status', event.target.value)}>
          <option value="">All statuses</option>
          {issueStatusSchema.options.map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </select>
      </label>
      <button className="secondary" onClick={() => onChange('clear', '')}>
        Clear filters
      </button>
    </div>
  );
}
