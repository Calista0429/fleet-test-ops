import { useSearchParams } from 'react-router-dom';
import { defaultDateRange, type DateRange } from '@fleet/contracts';
export function useDateRange() {
  const [params, setParams] = useSearchParams();
  const defaults = defaultDateRange();
  const range = { from: params.get('from') ?? defaults.from, to: params.get('to') ?? defaults.to };
  return {
    range,
    apply: (value: DateRange) =>
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('from', value.from);
        next.set('to', value.to);
        next.delete('page');
        return next;
      }),
  };
}
