import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  vehicleStatusSchema,
  type Vehicle,
  type VehicleStatus,
  type Page,
  type TestRun,
} from '@fleet/contracts';
import { apiRequest } from '../../lib/api';
import { useApi } from '../../lib/use-api';
import { useDateRange } from '../../lib/use-date-range';
import { formatDistance, formatJst, queryString } from '../../lib/format';
import { StatePanel } from '../../components/StatePanel';
import { StatusBadge } from '../../components/StatusBadge';
import { DateRangeControls } from '../../components/DateRangeControls';
import { Pagination } from '../../components/Pagination';
function StatusForm({ vehicle, onSaved }: { vehicle: Vehicle; onSaved: () => void }) {
  const [status, setStatus] = useState<VehicleStatus>(vehicle.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="status-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        setPending(true);
        setError('');
        try {
          await apiRequest<Vehicle>('/api/vehicles/' + vehicle.id + '/status', {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          });
          onSaved();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Could not save the status.');
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Operational status
        <select
          disabled={pending}
          value={status}
          onChange={(e) => setStatus(vehicleStatusSchema.parse(e.target.value))}
        >
          <option value="available">Available</option>
          <option value="testing">Testing</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </label>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save status'}
      </button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </form>
  );
}
export function VehicleDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { range, apply } = useDateRange();
  const page = Number(params.get('page') ?? 1);
  const vehicle = useApi<Vehicle>('/api/vehicles/' + id);
  const runs = useApi<Page<TestRun>>(
    '/api/test-runs?' + queryString({ vehicleId: id, ...range, page, pageSize: 10 }),
  );
  const [message, setMessage] = useState('');
  if (vehicle.loading) return <StatePanel loading />;
  if (vehicle.error?.status === 404)
    return (
      <section className="surface missing-page">
        <h1>Vehicle not found</h1>
        <p>This vehicle is no longer available.</p>
        <Link to="/">Back to overview</Link>
      </section>
    );
  if (vehicle.error || !vehicle.data)
    return (
      <>
        <Link to="/">Back to overview</Link>
        <StatePanel error={vehicle.error} retry={vehicle.reload} />
      </>
    );
  return (
    <>
      <Link className="back-link" to="/">
        Back to overview
      </Link>
      <header className="page-heading">
        <div>
          <h1 className="equipment-id">{vehicle.data.licensePlate}</h1>
          <p>{vehicle.data.model}</p>
        </div>
        <StatusBadge value={vehicle.data.status} />
      </header>
      <section className="surface vehicle-profile">
        <div>
          <h2>Vehicle readiness</h2>
          <p className="subtle">Set the current operational status before assigning a test.</p>
          <p>Last updated {formatJst(vehicle.data.updatedAt)}</p>
        </div>
        <StatusForm
          key={vehicle.data.updatedAt}
          vehicle={vehicle.data}
          onSaved={() => {
            setMessage('Vehicle status saved.');
            vehicle.reload();
          }}
        />
        {message && (
          <p className="success-message" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="surface" aria-labelledby="history-title">
        <div className="surface-heading">
          <div>
            <h2 id="history-title">Test history</h2>
            <p className="subtle">Start times shown in Japan Standard Time.</p>
          </div>
          <DateRangeControls key={range.from + range.to} range={range} onApply={apply} />
        </div>
        {runs.loading || runs.error || !runs.data ? (
          <StatePanel loading={runs.loading} error={runs.error} retry={runs.reload} />
        ) : runs.data.items.length === 0 ? (
          <StatePanel empty="No test runs in this period. Try a wider date range." />
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Vehicle test runs</caption>
              <thead>
                <tr>
                  <th scope="col">Started (JST)</th>
                  <th scope="col">Driver</th>
                  <th scope="col">Run status</th>
                  <th scope="col">Distance</th>
                  <th scope="col">Issues</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.items.map((run) => (
                  <tr key={run.id}>
                    <th scope="row">{formatJst(run.startedAt)}</th>
                    <td>{run.driverName}</td>
                    <td>
                      <StatusBadge value={run.status} />
                    </td>
                    <td>
                      <span
                        aria-label={run.distanceKm === null ? 'Distance not recorded' : undefined}
                      >
                        {formatDistance(run.distanceKm)}
                      </span>
                    </td>
                    <td>
                      <Link to={'/issues?testRunId=' + run.id}>
                        {run.issueCount} {run.issueCount === 1 ? 'issue' : 'issues'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {runs.data && !runs.loading && !runs.error && (
          <Pagination
            page={page}
            pageSize={10}
            total={runs.data.total}
            onChange={(next) =>
              setParams((previous) => {
                const changed = new URLSearchParams(previous);
                changed.set('page', String(next));
                return changed;
              })
            }
          />
        )}
      </section>
    </>
  );
}
