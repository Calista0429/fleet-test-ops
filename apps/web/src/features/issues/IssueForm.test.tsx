// @vitest-environment jsdom
import '../../test/setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Issue, TestRun } from '@fleet/contracts';
import { IssueForm } from './IssueForm';
import { vehicle, deferred } from '../../test/fixtures';
export const run: TestRun = {
  id: '20000000-0000-4000-8000-000000000001',
  vehicleId: vehicle.id,
  driverName: 'Test driver',
  startedAt: '2026-10-01T00:00:00.000Z',
  endedAt: '2026-10-01T01:00:00.000Z',
  distanceKm: 42.5,
  status: 'completed',
  issueCount: 0,
};
export const savedIssue: Issue = {
  id: '30000000-0000-4000-8000-000000000001',
  testRunId: run.id,
  vehicleId: vehicle.id,
  licensePlate: vehicle.licensePlate,
  runStartedAt: run.startedAt,
  issueType: 'sensor_failure',
  description: 'Camera connection failed during testing.',
  severity: 'high',
  status: 'open',
  createdAt: '2026-10-01T02:00:00.000Z',
  updatedAt: '2026-10-01T02:00:00.000Z',
  resolvedAt: null,
};
const other = { ...vehicle, id: '10000000-0000-4000-8000-000000000002', licensePlate: 'TEST-002' };
function mockReads(writeResponse?: Response | Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (options?.method) return writeResponse ?? Response.json(savedIssue, { status: 201 });
    const path = String(input);
    const items = path.includes('/vehicles')
      ? [vehicle, other]
      : path.includes(other.id)
        ? []
        : [run];
    return Response.json({ items, page: 1, pageSize: 20, total: items.length });
  });
}
async function chooseRun() {
  await userEvent.selectOptions(
    await screen.findByRole('combobox', { name: 'Vehicle' }),
    vehicle.id,
  );
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Test run' })).toBeEnabled());
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Test run' }), run.id);
}
describe('issue form', () => {
  it('clears the selected run when the vehicle changes', async () => {
    mockReads();
    render(<IssueForm mode="create" onSaved={vi.fn()} />);
    await chooseRun();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Vehicle' }), other.id);
    expect(screen.getByRole('combobox', { name: 'Test run' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create issue' })).toBeDisabled();
  });
  it('validates a trimmed issue description before making a request', async () => {
    const fetch = mockReads();
    render(<IssueForm mode="create" onSaved={vi.fn()} />);
    await chooseRun();
    await userEvent.type(screen.getByLabelText('Description'), '   short  ');
    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    await screen.findByText('Describe the issue in at least 10 characters.');
    expect(fetch.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(0);
  });
  it('creates an issue without a redundant vehicle key or server timestamps', async () => {
    const fetch = mockReads();
    const onSaved = vi.fn();
    render(<IssueForm mode="create" onSaved={onSaved} />);
    await chooseRun();
    await userEvent.type(
      screen.getByLabelText('Description'),
      ' Camera connection failed during testing. ',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedIssue));
    const post = fetch.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      testRunId: run.id,
      issueType: 'sensor_failure',
      description: 'Camera connection failed during testing.',
      severity: 'high',
    });
  });
  it('preserves issue input and shows server field errors', async () => {
    mockReads(
      Response.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Choose another run.',
            fieldErrors: { testRunId: ['This test run no longer exists.'] },
          },
        },
        { status: 400 },
      ),
    );
    render(<IssueForm mode="create" onSaved={vi.fn()} />);
    await chooseRun();
    await userEvent.type(
      screen.getByLabelText('Description'),
      'Camera connection failed during testing.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    await screen.findByText('This test run no longer exists.');
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Camera connection failed during testing.',
    );
  });
  it('prevents repeated issue submission while the save is pending', async () => {
    const pending = deferred<Response>();
    const fetch = mockReads(pending.promise);
    const onSaved = vi.fn();
    render(<IssueForm mode="create" onSaved={onSaved} />);
    await chooseRun();
    await userEvent.type(
      screen.getByLabelText('Description'),
      'Camera connection failed during testing.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(fetch.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(1);
    await act(async () => pending.resolve(Response.json(savedIssue, { status: 201 })));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
  it('edits issue severity and status through the update contract', async () => {
    const fetch = mockReads(
      Response.json({
        ...savedIssue,
        severity: 'critical',
        status: 'resolved',
        resolvedAt: '2026-10-01T03:00:00.000Z',
      }),
    );
    const onSaved = vi.fn();
    render(<IssueForm mode="edit" issue={savedIssue} onSaved={onSaved} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Severity' }), 'critical');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'resolved');
    await userEvent.click(screen.getByRole('button', { name: 'Save issue' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const patch = fetch.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
      description: savedIssue.description,
      severity: 'critical',
      status: 'resolved',
    });
  });
  it('allows selecting older runs on the next run page', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      return Response.json(
        path.includes('/vehicles')
          ? { items: [vehicle], page: 1, pageSize: 20, total: 1 }
          : path.includes('page=2')
            ? { items: [run], page: 2, pageSize: 20, total: 21 }
            : { items: [], page: 1, pageSize: 20, total: 21 },
      );
    });
    render(<IssueForm mode="create" onSaved={vi.fn()} />);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Vehicle' }),
      vehicle.id,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'More runs' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Test run' })).toBeEnabled());
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Test run' }), run.id);
    expect(screen.getByRole('button', { name: 'Create issue' })).toBeEnabled();
  });
});
