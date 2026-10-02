import { describe, expect, it } from 'vitest';
import {
  dateRangeSchema,
  createIssueSchema,
  updateIssueSchema,
  paginationSchema,
  jstRange,
  jstToday,
  defaultDateRange,
} from '../src/index.js';
describe('calendar ranges and input contracts', () => {
  it('converts inclusive JST dates to an exclusive UTC interval', () => {
    expect(jstRange('2026-10-01', '2026-10-02')).toEqual({
      start: '2026-09-30T15:00:00.000Z',
      endExclusive: '2026-10-02T15:00:00.000Z',
    });
  });
  it.each(['2026-02-30', '2026-13-01', '2026-00-01', 'not-a-date', '0000-01-01'])(
    'rejects impossible calendar date %s',
    (from) => {
      expect(dateRangeSchema.safeParse({ from, to: '2026-12-31' }).success).toBe(false);
    },
  );
  it('rejects a reversed range', () =>
    expect(dateRangeSchema.safeParse({ from: '2026-10-02', to: '2026-10-01' }).success).toBe(
      false,
    ));
  it('accepts an actual leap day', () =>
    expect(dateRangeSchema.safeParse({ from: '2024-02-29', to: '2024-03-01' }).success).toBe(true));
  it('uses JST after UTC 15:00', () =>
    expect(jstToday(new Date('2026-10-01T15:01:00Z'))).toBe('2026-10-02'));
  it('defaults to seven calendar days including today', () =>
    expect(defaultDateRange(new Date('2026-10-01T15:01:00Z'))).toEqual({
      from: '2026-09-26',
      to: '2026-10-02',
    }));
  const valid = {
    testRunId: '00000000-0000-4000-8000-000000000001',
    issueType: 'sensor_failure',
    description: 'A sensor stopped responding.',
    severity: 'high',
  };
  it('rejects an invalid run identifier', () =>
    expect(createIssueSchema.safeParse({ ...valid, testRunId: 'invalid' }).success).toBe(false));
  it('rejects a short trimmed description', () =>
    expect(createIssueSchema.safeParse({ ...valid, description: '    short    ' }).success).toBe(
      false,
    ));
  it('rejects an unknown severity', () =>
    expect(createIssueSchema.safeParse({ ...valid, severity: 'urgent' }).success).toBe(false));
  it('rejects a description above 2000 characters', () =>
    expect(createIssueSchema.safeParse({ ...valid, description: 'x'.repeat(2001) }).success).toBe(
      false,
    ));
  it('rejects an empty update', () => expect(updateIssueSchema.safeParse({}).success).toBe(false));
  it('rejects unknown mutation properties', () =>
    expect(createIssueSchema.safeParse({ ...valid, vehicleId: valid.testRunId }).success).toBe(
      false,
    ));
  it.each([{ page: 0 }, { page: 1.5 }, { pageSize: 101 }, { page: ['1', '2'] }])(
    'rejects invalid pagination %j',
    (value) => expect(paginationSchema.safeParse(value).success).toBe(false),
  );
});
