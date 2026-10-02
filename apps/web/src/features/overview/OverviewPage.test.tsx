// @vitest-environment jsdom
import '../../test/setup';
import {describe,it,expect,vi} from 'vitest';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {OverviewPage} from './OverviewPage';
import {makeDashboard,vehicle} from '../../test/fixtures';
function show(){render(<MemoryRouter initialEntries={['/?from=2026-10-01&to=2026-10-01']}><OverviewPage/></MemoryRouter>);}
function responses(empty=false){return vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{const path=String(input);return Response.json(path.includes('/dashboard')?makeDashboard():{items:empty||path.includes('search=missing')||path.includes('status=maintenance')?[]:[vehicle],page:1,pageSize:5,total:empty?0:1});});}
describe('fleet overview',()=>{
 it('keeps current-state labels distinct when the date range changes',async()=>{const fetch=responses();show();await screen.findByText('Available now');await userEvent.clear(screen.getByLabelText('Start date'));await userEvent.type(screen.getByLabelText('Start date'),'2026-09-30');await userEvent.click(screen.getByRole('button',{name:'Apply dates'}));await waitFor(()=>expect(fetch.mock.calls.some(call=>String(call[0]).includes('from=2026-09-30'))).toBe(true));expect(screen.getByText('Unresolved now')).toBeVisible();});
 it('filters vehicles and supplies a detail link',async()=>{responses();show();const link=await screen.findByRole('link',{name:vehicle.licensePlate});expect(link.getAttribute('href')).toContain('/vehicles/'+vehicle.id);await userEvent.type(screen.getByLabelText('Search vehicles'),'missing');await screen.findByText('No vehicles match these filters.');await userEvent.clear(screen.getByLabelText('Search vehicles'));await screen.findByRole('link',{name:vehicle.licensePlate});await userEvent.selectOptions(screen.getByLabelText('Vehicle status'),'maintenance');await screen.findByText('No vehicles match these filters.');});
 it('offers retry on failures and displays an honest empty state',async()=>{vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:{code:'INTERNAL_ERROR',message:'Connection failed.'}},{status:500}));show();await screen.findAllByText('Connection failed.');expect(screen.getAllByRole('button',{name:'Try again'}).length).toBeGreaterThan(0);});
 it('explains an empty fleet',async()=>{responses(true);show();await screen.findByText('No vehicles match these filters.');});
});
