import {Link,useSearchParams} from 'react-router-dom';
import type {DashboardResponse,Page,Vehicle} from '@fleet/contracts';
import {useApi} from '../../lib/use-api';
import {useDateRange} from '../../lib/use-date-range';
import {formatDistance,queryString} from '../../lib/format';
import {StatePanel} from '../../components/StatePanel';
import {StatusBadge} from '../../components/StatusBadge';
import {DateRangeControls} from '../../components/DateRangeControls';
import {DistanceCharts} from '../../components/DistanceCharts';
import {Pagination} from '../../components/Pagination';
export function OverviewPage(){
 const [params,setParams]=useSearchParams();const {range,apply}=useDateRange();
 const dashboard=useApi<DashboardResponse>('/api/dashboard?'+queryString(range));
 const page=Number(params.get('page')??1);const search=params.get('search')??'';const status=params.get('status')??'';const sort=params.get('sort')??'licensePlate';const direction=params.get('direction')??'asc';
 const vehicles=useApi<Page<Vehicle>>('/api/vehicles?'+queryString({page,pageSize:5,search,status,sort,direction}));
 function filter(key:string,value:string){setParams(previous=>{const next=new URLSearchParams(previous);if(value)next.set(key,value);else next.delete(key);if(key!=='page')next.delete('page');return next;});}
 return <>
 <header className='page-heading'><div><h1>Fleet overview</h1><p>Check readiness, track test activity, and follow up on issues.</p></div><Link to='/issues' className='primary button-link'>Review issues</Link></header>
 <section aria-labelledby='readiness-title'><div className='section-heading'><h2 id='readiness-title'>Fleet readiness</h2><span className='scope-label'>Current state · independent of date range</span></div>
 {dashboard.loading||dashboard.error||!dashboard.data?<StatePanel loading={dashboard.loading} error={dashboard.error} retry={dashboard.reload}/>:<div className='readiness-grid'>
 <article className='metric'><span>Vehicles in fleet</span><strong>{dashboard.data.current.vehicleCount}</strong><small>Registered test vehicles</small></article>
 <article className='metric'><span>Available now</span><strong>{dashboard.data.current.availableVehicleCount}<small> / {dashboard.data.current.vehicleCount}</small></strong><small>Ready for the next test</small></article>
 <article className='metric metric-alert'><span>Unresolved now</span><strong>{dashboard.data.current.unresolvedIssueCount}</strong><small>Open or in progress</small></article>
 </div>}</section>
 <section className='activity-section' aria-labelledby='activity-title'><div className='section-heading activity-heading'><div><h2 id='activity-title'>Test activity</h2><p className='subtle'>Completed runs starting in the selected period</p></div><DateRangeControls key={range.from+range.to} range={range} onApply={apply}/></div>
 {dashboard.data&&!dashboard.loading&&!dashboard.error&&<><div className='period-summary'><div><strong>{formatDistance(dashboard.data.period.completedDistanceKm)}</strong><span>Completed distance</span></div><div><strong>{dashboard.data.period.completedRunCount}</strong><span>Completed runs</span></div><p>{range.from} through {range.to}<br/>Japan Standard Time (UTC+09:00)</p></div>{dashboard.data.period.completedRunCount===0&&<p className='notice'>No completed runs in this period. Distance values are zero.</p>}<DistanceCharts data={dashboard.data}/></>}
 </section>
 <section className='surface' aria-labelledby='vehicles-title'><div className='surface-heading'><div><h2 id='vehicles-title'>Vehicles</h2><p className='subtle'>Select a vehicle to inspect its test history.</p></div><span className='scope-label'>Current operational status</span></div>
 <div className='filter-row'><label className='search-field'>Search vehicles<input type='search' placeholder='Plate or model' value={search} onChange={e=>filter('search',e.target.value)}/></label><label>Vehicle status<select value={status} onChange={e=>filter('status',e.target.value)}><option value=''>All statuses</option><option value='available'>Available</option><option value='testing'>Testing</option><option value='maintenance'>Maintenance</option></select></label><label>Sort vehicles<select value={sort} onChange={e=>filter('sort',e.target.value)}><option value='licensePlate'>License plate</option><option value='model'>Model</option><option value='status'>Status</option></select></label><button className='secondary sort-button' onClick={()=>filter('direction',direction==='asc'?'desc':'asc')}>{direction==='asc'?'Ascending':'Descending'}</button></div>
 {vehicles.loading||vehicles.error||!vehicles.data?<StatePanel loading={vehicles.loading} error={vehicles.error} retry={vehicles.reload}/>:vehicles.data.items.length===0?<StatePanel empty='No vehicles match these filters.'/>:<div className='table-scroll'><table><caption className='sr-only'>Current fleet vehicles</caption><thead><tr><th scope='col'>License plate</th><th scope='col'>Model</th><th scope='col'>Operational status</th><th scope='col'>Details</th></tr></thead><tbody>{vehicles.data.items.map(v=><tr key={v.id}><th scope='row'><Link className='equipment-id' to={'/vehicles/'+v.id+'?'+queryString(range)}>{v.licensePlate}</Link></th><td>{v.model}</td><td><StatusBadge value={v.status}/></td><td><Link to={'/vehicles/'+v.id+'?'+queryString(range)} aria-label={'View '+v.licensePlate}>View history</Link></td></tr>)}</tbody></table></div>}
 {vehicles.data&&!vehicles.loading&&!vehicles.error&&<Pagination page={page} pageSize={5} total={vehicles.data.total} onChange={next=>filter('page',String(next))}/>}</section>
 </>;
}
