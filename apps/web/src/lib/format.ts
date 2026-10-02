export function formatJst(iso: string) {
  return (
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso)) + ' JST'
  );
}
export function formatDistance(km: number | null) {
  return km === null
    ? '—'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(km) + ' km';
}
export function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return params.toString();
}
export function titleCase(value: string) {
  return value
    .split('_')
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ');
}
