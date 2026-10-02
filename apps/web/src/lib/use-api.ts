import {useEffect,useState,useCallback} from 'react';
import {apiRequest,ApiClientError} from './api';
export function useApi<T>(path:string):{data:T|null;loading:boolean;error:ApiClientError|null;reload():void} {
 const [data,setData]=useState<T|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<ApiClientError|null>(null);const [reloadKey,setReloadKey]=useState(0);
 useEffect(()=>{const controller=new AbortController();let active=true;setLoading(true);setData(null);setError(null);
  apiRequest<T>(path,{signal:controller.signal}).then(value=>{if(active)setData(value);}).catch(failure=>{if(active&&failure.name!=='AbortError')setError(failure instanceof ApiClientError?failure:new ApiClientError(0,'REQUEST_FAILED','Could not load this information. Please try again.'));}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;controller.abort();};
 },[path,reloadKey]);
 return {data,loading,error,reload:useCallback(()=>setReloadKey(key=>key+1),[])};
}
