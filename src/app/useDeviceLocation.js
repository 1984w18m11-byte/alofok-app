import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import cities from '../data/cities.seed.json';

const KEY='alofok_v3_location';
const rad=x=>x*Math.PI/180;
function distanceKm(a,b){
 const R=6371;
 const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
 return 2*R*Math.asin(Math.sqrt(h));
}
function nearestCity(coords){
 let best=null;
 for(const city of cities){
  const km=distanceKm(coords,{lat:city.lat,lon:city.lon});
  if(!best||km<best.km)best={city,km};
 }
 return best;
}
function reverseLabel(item,rtl){
 if(!item)return null;
 const values=rtl
  ?[item.district,item.subregion,item.city,item.region,item.name]
  :[item.district,item.subregion,item.city,item.region,item.name];
 return values.find(v=>typeof v==='string'&&v.trim())||null;
}

export function useDeviceLocation({rtl=true}={}){
 const fallback=cities[0];
 const [state,setState]=useState({
  lat:fallback.lat,lon:fallback.lon,tz:fallback.tz,country:fallback.country,
  label:rtl?fallback.name_ar:fallback.name_en,accuracy:null,source:'fallback',busy:false,error:null
 });
 const watcher=useRef(null);

 useEffect(()=>{
  let alive=true;
  AsyncStorage.getItem(KEY).then(raw=>{
   if(!alive||!raw)return;
   try{const x=JSON.parse(raw);if(Number.isFinite(x.lat)&&Number.isFinite(x.lon))setState(s=>({...s,...x,busy:false,error:null}));}catch(e){}
  }).catch(()=>{});
  return()=>{alive=false;try{watcher.current?.remove()}catch(e){}};
 },[]);

 useEffect(()=>{
  setState(s=>{
   if(s.source==='gps'||s.source==='saved')return s;
   const nearest=nearestCity(s);
   return {...s,label:rtl?nearest?.city?.name_ar||s.label:nearest?.city?.name_en||s.label};
  });
 },[rtl]);

 const persist=useCallback(async next=>{
  const saved={lat:next.lat,lon:next.lon,tz:next.tz,country:next.country,label:next.label,accuracy:next.accuracy,source:'saved'};
  try{await AsyncStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}
 },[]);

 const refresh=useCallback(async()=>{
  try{
   setState(s=>({...s,busy:true,error:null}));
   if(!(await Location.hasServicesEnabledAsync()))throw new Error('SERVICES_OFF');
   const existing=await Location.getForegroundPermissionsAsync();
   const permission=existing.status==='granted'?existing:await Location.requestForegroundPermissionsAsync();
   if(permission.status!=='granted')throw new Error('PERMISSION_DENIED');

   let best=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Highest,mayShowUserSettingsDialog:true});
   await new Promise(resolve=>{
    let done=false;
    const finish=()=>{if(done)return;done=true;try{watcher.current?.remove()}catch(e){};watcher.current=null;resolve()};
    const timer=setTimeout(()=>{clearTimeout(timer);finish()},6500);
    Location.watchPositionAsync({accuracy:Location.Accuracy.Highest,timeInterval:900,distanceInterval:0},pos=>{
     if(!best||((pos.coords.accuracy||9999)<(best.coords.accuracy||9999)))best=pos;
     if((best.coords.accuracy||9999)<=25){clearTimeout(timer);finish()}
    }).then(sub=>{watcher.current=sub}).catch(()=>{});
   });

   const coords={lat:best.coords.latitude,lon:best.coords.longitude};
   const nearest=nearestCity(coords);
   let geocode=null;
   try{geocode=(await Location.reverseGeocodeAsync({latitude:coords.lat,longitude:coords.lon}))?.[0]||null}catch(e){}
   const seededLabel=nearest&&nearest.km<=15?(rtl?nearest.city.name_ar:nearest.city.name_en):null;
   const label=seededLabel||reverseLabel(geocode,rtl)||(nearest?(rtl?nearest.city.name_ar:nearest.city.name_en):null)||`${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
   const next={
    lat:coords.lat,lon:coords.lon,
    tz:nearest?.city?.tz||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',
    country:(geocode?.isoCountryCode||nearest?.city?.country||'').toUpperCase(),
    label,accuracy:best.coords.accuracy||null,source:'gps',busy:false,error:null
   };
   setState(next);await persist(next);return next;
  }catch(e){
   const code=e?.message||'LOCATION_ERROR';
   setState(s=>({...s,busy:false,error:code}));
   return null;
  }
 },[persist,rtl]);

 const setManualCity=useCallback(async city=>{
  if(!city)return;
  const next={lat:city.lat,lon:city.lon,tz:city.tz,country:city.country,label:rtl?city.name_ar:city.name_en,accuracy:null,source:'manual',busy:false,error:null};
  setState(next);await persist(next);
 },[persist,rtl]);

 return useMemo(()=>({...state,refresh,setManualCity,cities}),[state,refresh,setManualCity]);
}
