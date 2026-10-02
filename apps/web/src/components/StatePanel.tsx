import type { ApiClientError } from '../lib/api';
export function StatePanel({
  loading,
  error,
  retry,
  empty,
}: {
  loading?: boolean;
  error?: ApiClientError | null;
  retry?: () => void;
  empty?: string;
}) {
  if (loading)
    return (
      <div className="state-panel" role="status">
        <span className="loading-mark" aria-hidden="true" />
        Loading operations data…
      </div>
    );
  if (error)
    return (
      <div className="state-panel error-panel" role="alert">
        <p>{error.message}</p>
        {retry && (
          <button className="secondary" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  return (
    <div className="state-panel">
      <p>{empty}</p>
    </div>
  );
}
