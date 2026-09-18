import {useCallback,useEffect,useMemo,useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import adhkar from '../data/adhkar.json';

const MORNING_ENABLED='alofok_adhkar_morning_enabled';
const EVENING_ENABLED='alofok_adhkar_evening_enabled';
const MORNING_DONE='alofok_adhkar_morning_done';
const EVENING_DONE='alofok_adhkar_evening_done';

function localParts(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return {key:`${v.year}-${v.month}-${v.day}`,minutes:Number(v.hour)*60+Number(v.minute)};
 }catch(_){
  return {key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,minutes:date.getHours()*60+date.getMinutes()};
 }
}

function localDateAt(date,timeZone,hour,minute=0){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const middayUtc=new Date(Date.UTC(+v.year,+v.month-1,+v.day,12,0,0));
  const zparts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(middayUtc);
  const z=Object.fromEntries(zparts.map(p=>[p.type,p.value]));
  const represented=Date.UTC(+z.year,+z.month-1,+z.day,+z.hour,+z.minute,+z.second);
  const offset=represented-middayUtc.getTime();
  return new Date(Date.UTC(+v.year,+v.month-1,+v.day,hour,minute,0)-offset);
 }catch(_){
  const x=new Date(date);x.setHours(hour,minute,0,0);return x;
 }
}

async function ensurePermission(){
 const current=await Notifications.getPermissionsAsync();
 if(current.status==='granted')return true;
 const asked=await Notifications.requestPermissionsAsync();
 return asked.status==='granted';
}

export function useAdhkar({now,fajrDate,timeZone,language='ar'}){
 const [morningEnabled,setMorningEnabledState]=useState(true);
 const [eveningEnabled,setEveningEnabledState]=useState(true);
 const [morningDone,setMorningDone]=useState('');
 const [eveningDone,setEveningDone]=useState('');
 const [openKind,setOpenKind]=useState(null);

 useEffect(()=>{
  Promise.all([
   AsyncStorage.getItem(MORNING_ENABLED),
   AsyncStorage.getItem(EVENING_ENABLED),
   AsyncStorage.getItem(MORNING_DONE),
   AsyncStorage.getItem(EVENING_DONE)
  ]).then(([m,e,md,ed])=>{
   setMorningEnabledState(m!=='0');
   setEveningEnabledState(e!=='0');
   setMorningDone(md||'');
   setEveningDone(ed||'');
  }).catch(()=>{});
 },[]);

 const parts=useMemo(()=>localParts(now,timeZone),[now,timeZone]);
 const morningVisible=morningEnabled&&morningDone!==parts.key&&fajrDate instanceof Date&&!Number.isNaN(fajrDate.getTime())&&now.getTime()>=fajrDate.getTime()&&parts.minutes<600;
 const eveningVisible=eveningEnabled&&eveningDone!==parts.key&&parts.minutes>=1260&&parts.minutes<1440;
 const activeKind=morningVisible?'morning':(eveningVisible?'evening':null);

 const setMorningEnabled=useCallback(async enabled=>{
  if(enabled&&!await ensurePermission())return false;
  setMorningEnabledState(enabled);
  await AsyncStorage.setItem(MORNING_ENABLED,enabled?'1':'0').catch(()=>{});
  return true;
 },[]);
 const setEveningEnabled=useCallback(async enabled=>{
  if(enabled&&!await ensurePermission())return false;
  setEveningEnabledState(enabled);
  await AsyncStorage.setItem(EVENING_ENABLED,enabled?'1':'0').catch(()=>{});
  return true;
 },[]);

 const complete=useCallback(async kind=>{
  const key=localParts(new Date(),timeZone).key;
  if(kind==='morning'){
   setMorningDone(key);
   await AsyncStorage.setItem(MORNING_DONE,key).catch(()=>{});
  }else{
   setEveningDone(key);
   await AsyncStorage.setItem(EVENING_DONE,key).catch(()=>{});
  }
  setOpenKind(null);
 },[timeZone]);

 const schedule=useCallback(async()=>{
  const permission=await Notifications.getPermissionsAsync();
  if(permission.status!=='granted')return;
  const scheduled=await Notifications.getAllScheduledNotificationsAsync();
  for(const n of scheduled){
   if(n.content?.data?.kind==='alofok-adhkar')await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
  const channelId='alofok-adhkar';
  if(Platform.OS==='android'){
   await Notifications.setNotificationChannelAsync(channelId,{name:'Al-Ufuq — Adhkar',importance:Notifications.AndroidImportance.DEFAULT,vibrationPattern:[0,180]});
  }
  const ar=String(language).startsWith('ar');
  if(morningEnabled&&fajrDate instanceof Date&&fajrDate.getTime()>Date.now()){
   await Notifications.scheduleNotificationAsync({
    content:{title:ar?'أذكار الصباح':'Morning Adhkar',body:ar?'حان وقت أذكار الصباح.':'It is time for your morning Adhkar.',data:{kind:'alofok-adhkar',period:'morning'}},
    trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:fajrDate,channelId:Platform.OS==='android'?channelId:undefined}
   });
  }
  const eveningDate=localDateAt(now,timeZone,21,0);
  if(eveningEnabled&&eveningDate.getTime()>Date.now()){
   await Notifications.scheduleNotificationAsync({
    content:{title:ar?'أذكار المساء':'Evening Adhkar',body:ar?'حان وقت أذكار المساء.':'It is time for your evening Adhkar.',data:{kind:'alofok-adhkar',period:'evening'}},
    trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:eveningDate,channelId:Platform.OS==='android'?channelId:undefined}
   });
  }
 },[morningEnabled,eveningEnabled,fajrDate,timeZone,language,parts.key]);

 useEffect(()=>{schedule().catch(()=>{})},[schedule]);

 return useMemo(()=>({
  morningEnabled,eveningEnabled,setMorningEnabled,setEveningEnabled,
  morningVisible,eveningVisible,activeKind,openKind,setOpenKind,
  complete,
  items:kind=>adhkar[kind]||[]
 }),[morningEnabled,eveningEnabled,morningVisible,eveningVisible,activeKind,openKind,setMorningEnabled,setEveningEnabled,complete]);
}
