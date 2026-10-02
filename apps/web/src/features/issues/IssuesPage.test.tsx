// @vitest-environment jsdom
import '../../test/setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Issue } from '@fleet/contracts';
import { IssuesPage } from './IssuesPage';
import { vehicle } from '../../test/fixtures';
const issue: Issue = {
  id: '30000000-0000-4000-8000-000000000001',
  testRunId: '20000000-0000-4000-8000-000000000001',
  vehicleId: vehicle.id,
  licensePlate: vehicle.licensePlate,
  runStartedAt: '2026-10-01T00:00:00.000Z',
  issueType: 'sensor_failure',
  description: 'Unique resolved camera fault.',
  severity: 'critical',
  status: 'resolved',
  createdAt: '2026-10-01T02:00:00.000Z',
  updatedAt: '2026-10-01T03:00:00.000Z',
  resolvedAt: '2026-10-01T03:00:00.000Z',
};
describe('issue management', () => {
  it('shows issue creation time and the related run in JST without opening the editor', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      Response.json({
        items: String(input).includes('/vehicles') ? [vehicle] : [issue],
        page: 1,
        pageSize: 100,
        total: 1,
      }),
    );
    render(
      <MemoryRouter>
        <IssuesPage />
      </MemoryRouter>,
    );
    const row = await screen.findByRole('row', { name: /Unique resolved camera fault/ });
    expect(within(row).getByText('Created 01 Oct 2026, 11:00 JST')).toBeVisible();
    expect(within(row).getByText('01 Oct 2026, 09:00 JST')).toBeVisible();
    expect(within(row).getByText('Run 000000000001')).toBeVisible();
  });
  it('allows filtering by a vehicle beyond the first 100 options', async () => {
    const target = {
      ...vehicle,
      id: '10000000-0000-4000-8000-000000000101',
      licensePlate: 'TEST-101',
    };
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname === '/api/vehicles') {
        const page = Number(url.searchParams.get('page') ?? 1);
        return Response.json({
          items:
            page === 1
              ? Array.from({ length: 100 }, (_, index) => ({
                  ...vehicle,
                  id: 'vehicle-' + index,
                  licensePlate: 'TEST-' + index,
                }))
              : [target],
          page,
          pageSize: 100,
          total: 101,
        });
      }
      return Response.json({ items: [], page: 1, pageSize: 10, total: 0 });
    });
    render(
      <MemoryRouter>
        <IssuesPage />
      </MemoryRouter>,
    );
    await screen.findByRole('option', { name: target.licensePlate });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Filter vehicle' }),
      target.id,
    );
    await waitFor(() =>
      expect(
        fetch.mock.calls.some((call) =>
          String(call[0]).includes('/api/issues?vehicleId=' + target.id),
        ),
      ).toBe(true),
    );
  });
  it('initializes issue filters from the URL and keeps a dated vehicle link', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      Response.json({
        items: String(input).includes('/vehicles') ? [vehicle] : [issue],
        page: 1,
        pageSize: 10,
        total: 1,
      }),
    );
    render(
      <MemoryRouter initialEntries={['/issues?severity=critical&status=resolved']}>
        <IssuesPage />
      </MemoryRouter>,
    );
    await screen.findByText(issue.description);
    expect(screen.getByRole('combobox', { name: 'Filter severity' })).toHaveValue('critical');
    expect(fetch.mock.calls.some((call) => String(call[0]).includes('severity=critical'))).toBe(
      true,
    );
    expect(
      screen.getByRole('link', { name: 'View vehicle ' + vehicle.licensePlate }),
    ).toHaveAttribute('href', '/vehicles/' + vehicle.id + '?from=2026-10-01&to=2026-10-01');
  });
  it('reopens an issue and removes its resolved timestamp from the reloaded list', async () => {
    let current = issue;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
      if (options?.method === 'PATCH') {
        current = { ...issue, status: 'open', resolvedAt: null };
        return Response.json(current);
      }
      return Response.json({
        items: String(input).includes('/vehicles') ? [vehicle] : [current],
        page: 1,
        pageSize: 10,
        total: 1,
      });
    });
    render(
      <MemoryRouter>
        <IssuesPage />
      </MemoryRouter>,
    );
    await screen.findByText(issue.description);
    await userEvent.click(screen.getByRole('button', { name: 'Edit issue' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'open');
    await userEvent.click(screen.getByRole('button', { name: 'Save issue' }));
    await screen.findByText('Issue saved.');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Save issue' })).not.toBeInTheDocument(),
    );
    const row = screen.getByRole('row', { name: /Unique resolved camera fault/ });
    expect(within(row).getByText('Open')).toBeVisible();
    expect(within(row).getByText('Not resolved')).toBeVisible();
  });
});
