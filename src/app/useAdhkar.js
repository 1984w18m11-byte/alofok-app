import {useCallback,useEffect,useMemo,useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {calculatePrayerTimes} from '../engine/prayer';

const MORNING_ENABLED_KEY='alofok_adhkar_morning_enabled_v2';
const EVENING_ENABLED_KEY='alofok_adhkar_evening_enabled_v2';
const MORNING_ALERT_KEY='alofok_adhkar_morning_alert_v2';
const EVENING_ALERT_KEY='alofok_adhkar_evening_alert_v2';
const MORNING_DONE_KEY='alofok_adhkar_morning_done_v2';
const EVENING_DONE_KEY='alofok_adhkar_evening_done_v2';
const IDS_KEY='alofok_adhkar_notification_ids_v2';

function zoneParts(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return {year:+v.year,month:+v.month,day:+v.day,hour:+v.hour,minute:+v.minute,key:`${v.year}-${v.month}-${v.day}`};
 }catch(_){
  const y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate();
  return {year:y,month:m,day:d,hour:date.getHours(),minute:date.getMinutes(),key:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`};
 }
}
function offsetMinutes(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return Math.round((Date.UTC(+v.year,+v.month-1,+v.day,+v.hour,+v.minute,+v.second)-date.getTime())/60000);
 }catch(_){return -date.getTimezoneOffset()}
}
function addLocalDays(parts,days){
 const d=new Date(Date.UTC(parts.year,parts.month-1,parts.day+days,12));
 return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()};
}
function localClockInstant(parts,timeZone,hour,minute=0){
 const wall=Date.UTC(parts.year,parts.month-1,parts.day,hour,minute,0);
 let guess=new Date(wall);
 for(let i=0;i<3;i++){
  const q=zoneParts(guess,timeZone);
  const represented=Date.UTC(q.year,q.month-1,q.day,q.hour,q.minute,0);
  guess=new Date(guess.getTime()+(wall-represented));
 }
 return guess;
}
function fajrInstant(parts,timeZone,lat,lon){
 const civil=new Date(Date.UTC(parts.year,parts.month-1,parts.day,12));
 const off=offsetMinutes(civil,timeZone);
 const result=calculatePrayerTimes({date:civil,lat,lon,tzOffsetMin:off,method:'MWL',clockLanguage:'en'});
 const minutes=result?.rawMinutesUtc?.fajr;
 if(minutes==null)return null;
 return new Date(Date.UTC(parts.year,parts.month-1,parts.day,0,0,0)+minutes*60000);
}
async function notificationPermission(){
 const current=await Notifications.getPermissionsAsync();
 if(current.status==='granted'||current.granted===true)return true;
 const next=await Notifications.requestPermissionsAsync();
 return next.status==='granted'||next.granted===true;
}

export function useAdhkar({now,fajrDate,timeZone='Asia/Baghdad',lat=33.3152,lon=44.3661,language='ar'}){
 const [morningEnabled,setMorningEnabledState]=useState(true);
 const [eveningEnabled,setEveningEnabledState]=useState(true);
 const [morningAlert,setMorningAlertState]=useState(false);
 const [eveningAlert,setEveningAlertState]=useState(false);
 const [morningDone,setMorningDone]=useState('');
 const [eveningDone,setEveningDone]=useState('');
 const [openedKind,setOpenedKind]=useState(null);
 const [ready,setReady]=useState(false);

 const local=useMemo(()=>zoneParts(now,timeZone),[now,timeZone]);
 const localMinutes=local.hour*60+local.minute;

 useEffect(()=>{
  let active=true;
  Promise.all([
   AsyncStorage.getItem(MORNING_ENABLED_KEY),
   AsyncStorage.getItem(EVENING_ENABLED_KEY),
   AsyncStorage.getItem(MORNING_ALERT_KEY),
   AsyncStorage.getItem(EVENING_ALERT_KEY),
   AsyncStorage.getItem(MORNING_DONE_KEY),
   AsyncStorage.getItem(EVENING_DONE_KEY)
  ]).then(([m,e,ma,ea,md,ed])=>{
   if(!active)return;
   setMorningEnabledState(m!=='0');
   setEveningEnabledState(e!=='0');
   setMorningAlertState(ma==='1');
   setEveningAlertState(ea==='1');
   setMorningDone(md||'');
   setEveningDone(ed||'');
   setReady(true);
  }).catch(()=>{if(active)setReady(true)});
  return()=>{active=false};
 },[]);

 useEffect(()=>{
  const sub=Notifications.addNotificationResponseReceivedListener(response=>{
   const data=response?.notification?.request?.content?.data||{};
   if(data.kind==='alofok-adhkar'&&(data.period==='morning'||data.period==='evening'))setOpenedKind(data.period);
  });
  return()=>sub.remove();
 },[]);

 const setMorningEnabled=useCallback(async enabled=>{
  const value=Boolean(enabled);setMorningEnabledState(value);
  try{await AsyncStorage.setItem(MORNING_ENABLED_KEY,value?'1':'0')}catch(_){}
 },[]);
 const setEveningEnabled=useCallback(async enabled=>{
  const value=Boolean(enabled);setEveningEnabledState(value);
  try{await AsyncStorage.setItem(EVENING_ENABLED_KEY,value?'1':'0')}catch(_){}
 },[]);
 const setMorningAlert=useCallback(async enabled=>{
  const value=Boolean(enabled);
  if(value&&!(await notificationPermission()))return false;
  setMorningAlertState(value);
  try{await AsyncStorage.setItem(MORNING_ALERT_KEY,value?'1':'0')}catch(_){}
  return true;
 },[]);
 const setEveningAlert=useCallback(async enabled=>{
  const value=Boolean(enabled);
  if(value&&!(await notificationPermission()))return false;
  setEveningAlertState(value);
  try{await AsyncStorage.setItem(EVENING_ALERT_KEY,value?'1':'0')}catch(_){}
  return true;
 },[]);

 const markComplete=useCallback(async period=>{
  const key=zoneParts(new Date(),timeZone).key;
  if(period==='evening'){
   setEveningDone(key);try{await AsyncStorage.setItem(EVENING_DONE_KEY,key)}catch(_){}
  }else{
   setMorningDone(key);try{await AsyncStorage.setItem(MORNING_DONE_KEY,key)}catch(_){}
  }
 },[timeZone]);

 const morningVisible=Boolean(
  ready&&morningEnabled&&morningDone!==local.key&&
  fajrDate instanceof Date&&!Number.isNaN(fajrDate.getTime())&&
  now.getTime()>=fajrDate.getTime()&&localMinutes<600
 );
 const eveningVisible=Boolean(
  ready&&eveningEnabled&&eveningDone!==local.key&&
  localMinutes>=1260&&localMinutes<1440
 );
 const visibleKind=morningVisible?'morning':eveningVisible?'evening':null;

 useEffect(()=>{
  if(!ready)return;
  let cancelled=false;
  (async()=>{
   try{
    const raw=await AsyncStorage.getItem(IDS_KEY);
    const oldIds=raw?JSON.parse(raw):[];
    await Promise.all((Array.isArray(oldIds)?oldIds:[]).map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})));
    if(!morningAlert&&!eveningAlert){await AsyncStorage.setItem(IDS_KEY,'[]');return}

    if(!(await notificationPermission()))return;
    const channelId='alofok-adhkar-reminders';
    if(Platform.OS==='android'){
     await Notifications.setNotificationChannelAsync(channelId,{name:'al ufuq — Adhkar',importance:Notifications.AndroidImportance.DEFAULT,vibrationPattern:[0,180,120,180],sound:'default'});
    }

    const ar=String(language).startsWith('ar');
    const base=zoneParts(new Date(),timeZone);
    const ids=[];
    for(let i=0;i<14&&!cancelled;i++){
     const day=addLocalDays(base,i);
     if(morningEnabled&&morningAlert){
      const fajr=fajrInstant(day,timeZone,lat,lon);
      if(fajr&&fajr.getTime()>Date.now()+5000){
       ids.push(await Notifications.scheduleNotificationAsync({
        content:{title:ar?'أذكار الصباح':'Morning adhkar',body:ar?'حان وقت أذكار الصباح. افتح تطبيق الأفق للقراءة.':'It is time for morning adhkar. Open al ufuq to read.',sound:'default',data:{kind:'alofok-adhkar',period:'morning'}},
        trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(fajr.getTime()+60000),channelId:Platform.OS==='android'?channelId:undefined}
       }));
      }
     }
     if(eveningEnabled&&eveningAlert){
      const evening=localClockInstant(day,timeZone,21,0);
      if(evening.getTime()>Date.now()+5000){
       ids.push(await Notifications.scheduleNotificationAsync({
        content:{title:ar?'أذكار المساء':'Evening adhkar',body:ar?'حان وقت أذكار المساء. افتح تطبيق الأفق للقراءة.':'It is time for evening adhkar. Open al ufuq to read.',sound:'default',data:{kind:'alofok-adhkar',period:'evening'}},
        trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:evening,channelId:Platform.OS==='android'?channelId:undefined}
       }));
      }
     }
    }
    await AsyncStorage.setItem(IDS_KEY,JSON.stringify(ids));
   }catch(_){}
  })();
  return()=>{cancelled=true};
 },[ready,morningEnabled,eveningEnabled,morningAlert,eveningAlert,timeZone,lat,lon,language,local.key]);

 const clearOpened=useCallback(()=>setOpenedKind(null),[]);

 return useMemo(()=>({
  morningEnabled,eveningEnabled,morningAlert,eveningAlert,
  morningVisible,eveningVisible,visibleKind,
  setMorningEnabled,setEveningEnabled,setMorningAlert,setEveningAlert,
  markComplete,openedKind,clearOpened
 }),[
  morningEnabled,eveningEnabled,morningAlert,eveningAlert,morningVisible,eveningVisible,visibleKind,
  setMorningEnabled,setEveningEnabled,setMorningAlert,setEveningAlert,markComplete,openedKind,clearOpened
 ]);
}
