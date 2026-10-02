import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { jstToday, type Issue, type Vehicle, type Page } from '@fleet/contracts';
import { useApi } from '../../lib/use-api';
import { queryString, formatJst, titleCase } from '../../lib/format';
import { IssueForm } from './IssueForm';
import { IssueFilters } from './IssueFilters';
import { StatusBadge } from '../../components/StatusBadge';
import { StatePanel } from '../../components/StatePanel';
import { Pagination } from '../../components/Pagination';
export function IssuesPage() {
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Issue | 'create' | null>(null);
  const [message, setMessage] = useState('');
  const newIssue = useRef<HTMLButtonElement>(null);
  const page = Number(params.get('page') ?? 1);
  const values = {
    vehicleId: params.get('vehicleId') ?? '',
    severity: params.get('severity') ?? '',
    status: params.get('status') ?? '',
  };
  const runId = params.get('testRunId') ?? '';
  const issues = useApi<Page<Issue>>(
    '/api/issues?' + queryString({ ...values, testRunId: runId, page, pageSize: 10 }),
  );
  const vehicles = useApi<Page<Vehicle>>('/api/vehicles?pageSize=100');
  function filter(key: string, value: string) {
    setParams((previous) => {
      const next = key === 'clear' ? new URLSearchParams() : new URLSearchParams(previous);
      if (key !== 'clear') {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (key !== 'page') next.delete('page');
      return next;
    });
  }
  function saved() {
    setMessage(editing === 'create' ? 'Issue created.' : 'Issue saved.');
    setEditing(null);
    issues.reload();
    newIssue.current?.focus();
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Issue management</h1>
          <p>Record incidents, prioritize follow-up, and close the loop.</p>
        </div>
        <button
          ref={newIssue}
          disabled={editing !== null}
          onClick={() => {
            setEditing('create');
            setMessage('');
          }}
        >
          New issue
        </button>
      </header>
      {message && (
        <p className="success-message issue-success" role="status">
          {message}
        </p>
      )}
      {editing === 'create' ? (
        <IssueForm mode="create" onSaved={saved} onCancel={() => setEditing(null)} />
      ) : (
        editing && (
          <IssueForm
            key={editing.id}
            mode="edit"
            issue={editing}
            onSaved={saved}
            onCancel={() => setEditing(null)}
          />
        )
      )}
      <section className="surface" aria-labelledby="issue-list-title">
        <div className="surface-heading">
          <div>
            <h2 id="issue-list-title">Incident register</h2>
            <p className="subtle">
              Each issue belongs to one test run. Vehicle context follows that relationship.
            </p>
          </div>
          <span className="scope-label">All incident dates</span>
        </div>
        {vehicles.error && (
          <div className="filter-warning">
            <StatePanel error={vehicles.error} retry={vehicles.reload} />
          </div>
        )}
        <IssueFilters values={values} vehicles={vehicles.data?.items ?? []} onChange={filter} />
        {runId && (
          <div className="run-filter">
            <span>Filtered to one test run</span>
            <button className="secondary" onClick={() => filter('testRunId', '')}>
              Show all runs
            </button>
          </div>
        )}
        {issues.loading || issues.error || !issues.data ? (
          <StatePanel loading={issues.loading} error={issues.error} retry={issues.reload} />
        ) : issues.data.items.length === 0 ? (
          <StatePanel empty="No issues match these filters. Clear the filters or create an issue." />
        ) : (
          <div className="table-scroll">
            <table className="issues-table">
              <caption className="sr-only">Fleet issue register</caption>
              <thead>
                <tr>
                  <th scope="col">Issue</th>
                  <th scope="col">Vehicle</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Status</th>
                  <th scope="col">Resolution</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.data.items.map((issue) => (
                  <tr key={issue.id}>
                    <th scope="row" className="issue-description">
                      <p>{issue.description}</p>
                      <small>{titleCase(issue.issueType)}</small>
                    </th>
                    <td>
                      <Link
                        className="equipment-id"
                        aria-label={'View vehicle ' + issue.licensePlate}
                        to={
                          '/vehicles/' +
                          issue.vehicleId +
                          '?' +
                          queryString({
                            from: jstToday(new Date(issue.runStartedAt)),
                            to: jstToday(new Date(issue.runStartedAt)),
                          })
                        }
                      >
                        {issue.licensePlate}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge value={issue.severity} />
                    </td>
                    <td>
                      <StatusBadge value={issue.status} />
                    </td>
                    <td className="resolution">
                      {issue.resolvedAt ? formatJst(issue.resolvedAt) : 'Not resolved'}
                    </td>
                    <td>
                      <button
                        className="secondary table-action"
                        disabled={editing !== null}
                        onClick={() => {
                          setEditing(issue);
                          setMessage('');
                        }}
                      >
                        Edit issue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {issues.data && !issues.loading && !issues.error && (
          <Pagination
            page={page}
            pageSize={10}
            total={issues.data.total}
            onChange={(next) => filter('page', String(next))}
          />
        )}
      </section>
    </>
  );
}
