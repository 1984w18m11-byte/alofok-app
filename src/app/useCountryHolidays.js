import {useEffect,useMemo,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fallbackEvents from '../data/national-events.json';
import iraqObservances from '../data/iraq-observances.json';

const API_BASE='https://nagerholidays.com/api/v4/Holidays';
const CACHE_PREFIX='alofok_v3_country_holidays_v1';

function two(n){return String(n).padStart(2,'0')}
function localFallback(country,year){
 const code=String(country||'').toUpperCase();
 const base=(fallbackEvents[code]||[]).map(x=>({
  date:`${year}-${two(x.month)}-${two(x.day)}`,
  name:x.name_en||x.name_ar,
  name_ar:x.name_ar,
  name_en:x.name_en,
  countryCode:code,
  nationalHoliday:true,
  holidayTypes:['Observance'],
  source:'embedded'
 }));
 const extra=code==='IQ'?iraqObservances.map(x=>({
  ...x,
  date:`${year}-${two(x.month)}-${two(x.day)}`,
  name:x.name_en||x.name_ar,
  countryCode:'IQ',
  nationalHoliday:true,
  holidayTypes:[x.kind==='official_public'?'Public':'Observance'],
  source:'embedded-iraq'
 })):[];
 const out=[];
 const seen=new Set();
 for(const item of [...extra,...base]){
  const key=`${item.date}|${(item.name_en||item.name||item.name_ar||'').toLowerCase()}`;
  if(seen.has(key))continue;
  seen.add(key);out.push(item);
 }
 return out;
}
function mergeHolidayData(remote,fallback){
 const out=[];const seen=new Set();
 const push=item=>{
  if(!item?.date)return;
  const name=(item.name_en||item.name||item.name_ar||'').trim();
  const key=`${item.date}|${name.toLowerCase()}`;
  if(seen.has(key))return;
  seen.add(key);out.push(item);
 };
 fallback.forEach(push);
 remote.forEach(push);
 return out.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function normalizeRemote(rows,country){
 return (Array.isArray(rows)?rows:[])
  .filter(x=>x&&x.date&&x.nationalHoliday!==false&&(!Array.isArray(x.subdivisionCodes)||x.subdivisionCodes.length===0))
  .map(x=>({
   date:x.date,
   name:x.name||'',
   name_en:x.name||'',
   countryCode:x.countryCode||country,
   nationalHoliday:x.nationalHoliday!==false,
   holidayTypes:Array.isArray(x.holidayTypes)?x.holidayTypes:[],
   source:'nager'
  }));
}

export function useCountryHolidays(country,year){
 const code=String(country||'').toUpperCase();
 const fallback=useMemo(()=>localFallback(code,year),[code,year]);
 const [state,setState]=useState({items:fallback,loading:false,error:null,source:'embedded'});

 useEffect(()=>{
  let alive=true;
  if(!code||!/^[A-Z]{2}$/.test(code)||!Number.isInteger(year)){
   setState({items:fallback,loading:false,error:null,source:'embedded'});return()=>{alive=false};
  }
  const cacheKey=`${CACHE_PREFIX}:${code}:${year}`;
  setState(s=>({...s,items:fallback,loading:true,error:null,source:'embedded'}));
  (async()=>{
   let cached=[];
   try{
    const raw=await AsyncStorage.getItem(cacheKey);
    if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))cached=parsed;}
   }catch(e){}
   if(alive&&cached.length)setState({items:mergeHolidayData(cached,fallback),loading:true,error:null,source:'cache'});
   try{
    const res=await fetch(`${API_BASE}/${encodeURIComponent(code)}/${year}`);
    if(!res.ok)throw new Error(`HTTP_${res.status}`);
    const remote=normalizeRemote(await res.json(),code);
    try{await AsyncStorage.setItem(cacheKey,JSON.stringify(remote))}catch(e){}
    if(alive)setState({items:mergeHolidayData(remote,fallback),loading:false,error:null,source:'network'});
   }catch(e){
    if(alive)setState({items:mergeHolidayData(cached,fallback),loading:false,error:e?.message||'HOLIDAY_FETCH_FAILED',source:cached.length?'cache':'embedded'});
   }
  })();
  return()=>{alive=false};
 },[code,year]);

 return state;
}
