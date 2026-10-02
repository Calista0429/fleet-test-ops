import { useState } from 'react';
import { dateRangeSchema, type DateRange } from '@fleet/contracts';
export function DateRangeControls({
  range,
  onApply,
}: {
  range: DateRange;
  onApply: (range: DateRange) => void;
}) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [error, setError] = useState('');
  return (
    <form
      className="date-controls"
      onSubmit={(event) => {
        event.preventDefault();
        const result = dateRangeSchema.safeParse({ from, to });
        if (!result.success) {
          setError(result.error.issues[0]?.message ?? 'Check the date range.');
          return;
        }
        setError('');
        onApply(result.data);
      }}
    >
      <label>
        Start date
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          required
        />
      </label>
      <label>
        End date
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} required />
      </label>
      <button className="secondary" type="submit">
        Apply dates
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
