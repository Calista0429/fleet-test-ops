import { z } from 'zod';
const day = 86_400_000;
export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number(value.slice(0,4)) > 0 && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}, 'Enter a real calendar date.');
export const dateRangeSchema = z.object({ from: calendarDateSchema, to: calendarDateSchema }).refine(({from,to}) => from <= to, { path:['to'], message:'End date must be on or after start date.' });
export type DateRange = z.infer<typeof dateRangeSchema>;
export function jstRange(from: string, to: string) {
  dateRangeSchema.parse({from,to});
  const start = new Date(from + 'T00:00:00+09:00');
  const end = new Date(to + 'T00:00:00+09:00');
  return { start:start.toISOString(), endExclusive:new Date(end.getTime()+day).toISOString() };
}
export function jstToday(now = new Date()) { return new Date(now.getTime()+9*3600_000).toISOString().slice(0,10); }
export function defaultDateRange(now = new Date()) {
  const to=jstToday(now);
  return { from:new Date(new Date(to+'T00:00:00Z').getTime()-6*day).toISOString().slice(0,10), to };
}
