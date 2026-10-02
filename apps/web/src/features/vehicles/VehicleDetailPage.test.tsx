// @vitest-environment jsdom
import '../../test/setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VehicleDetailPage } from './VehicleDetailPage';
import { vehicle } from '../../test/fixtures';
function show() {
  render(
    <MemoryRouter initialEntries={['/vehicles/' + vehicle.id]}>
      <Routes>
        <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
describe('vehicle details', () => {
  it('saves a status and reloads the visible value', async () => {
    let status = vehicle.status;
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
      if (options?.method === 'PATCH') status = 'maintenance';
      return Response.json(
        String(input).includes('/test-runs')
          ? { items: [], page: 1, pageSize: 10, total: 0 }
          : { ...vehicle, status },
      );
    });
    show();
    await screen.findByRole('heading', { name: vehicle.licensePlate });
    await userEvent.selectOptions(screen.getByLabelText('Operational status'), 'maintenance');
    await userEvent.click(screen.getByRole('button', { name: 'Save status' }));
    await screen.findByText('Vehicle status saved.');
    expect(screen.getByLabelText('Operational status')).toHaveValue('maintenance');
    expect(fetch.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true);
  });
  it('explains a missing vehicle and offers a way back', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { error: { code: 'NOT_FOUND', message: 'This record could not be found.' } },
        { status: 404 },
      ),
    );
    show();
    await screen.findByText('Vehicle not found');
    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/');
  });
});
