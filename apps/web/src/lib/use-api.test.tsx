// @vitest-environment jsdom
import '../test/setup';
import { describe,it,expect,vi } from 'vitest';
import { act,renderHook,waitFor } from '@testing-library/react';
import type { DashboardResponse } from '@fleet/contracts';
import { useApi } from './use-api';
import { apiRequest, ApiClientError } from './api';
import { deferred, makeDashboard } from '../test/fixtures';
describe('typed API requests',()=>{
 it('exposes field errors from unsuccessful responses',async()=>{vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:{code:'VALIDATION_ERROR',message:'Choose a run.',fieldErrors:{testRunId:['Missing run.']}}},{status:400}));const error=await apiRequest('/api/issues').catch(e=>e);expect(error).toBeInstanceOf(ApiClientError);if(!(error instanceof ApiClientError))throw error;expect(error.status).toBe(400);expect(error.fieldErrors?.testRunId).toEqual(['Missing run.']);});
 it('keeps the latest filter result when an earlier request finishes late',async()=>{
  const earlier=deferred<Response>();const later=deferred<Response>();vi.spyOn(globalThis,'fetch').mockReturnValueOnce(earlier.promise).mockReturnValueOnce(later.promise);
  const {result,rerender}=renderHook(({path})=>useApi<DashboardResponse>(path),{initialProps:{path:'/api/dashboard?from=2026-10-01&to=2026-10-01'}});
  rerender({path:'/api/dashboard?from=2026-10-02&to=2026-10-02'});await act(async()=>later.resolve(Response.json(makeDashboard(20))));await waitFor(()=>expect(result.current.data?.period.completedDistanceKm).toBe(20));
  await act(async()=>earlier.resolve(Response.json(makeDashboard(10))));expect(result.current.data?.period.completedDistanceKm).toBe(20);
 });
 it('shows loading and cancels requests when unmounted',()=>{const pending=deferred<Response>();const fetch=vi.spyOn(globalThis,'fetch').mockReturnValue(pending.promise);const {result,unmount}=renderHook(()=>useApi('/api/dashboard'));expect(result.current.loading).toBe(true);const signal=fetch.mock.calls[0]?.[1]?.signal;unmount();expect(signal?.aborted).toBe(true);});
 it('retries an error rather than presenting empty success',async()=>{const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(Response.json({error:{code:'INTERNAL_ERROR',message:'Please retry.'}},{status:500})).mockResolvedValueOnce(Response.json(makeDashboard()));const {result}=renderHook(()=>useApi<DashboardResponse>('/api/dashboard'));await waitFor(()=>expect(result.current.error?.code).toBe('INTERNAL_ERROR'));expect(result.current.data).toBeNull();act(()=>result.current.reload());await waitFor(()=>expect(result.current.data?.period.completedDistanceKm).toBe(20));expect(fetch).toHaveBeenCalledTimes(2);});
});
