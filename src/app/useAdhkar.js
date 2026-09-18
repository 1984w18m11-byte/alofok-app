import {useCallback,useEffect,useMemo,useState} from 'react';
import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MORNING_ENABLED_KEY='alofok_adhkar_morning_enabled';
const EVENING_ENABLED_KEY='alofok_adhkar_evening_enabled';
const ALERTS_KEY='alofok_adhkar_alerts_enabled';
const MORNING_DONE_KEY='alofok_adhkar_morning_done';
const EVENING_DONE_KEY='alofok_adhkar_evening_done';

function zoneParts(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Object.fromEntries(parts.map(p=>[p.type,p.value]));
 }catch(e){
  return {year:String(date.getFullYear()),month:String(date.getMonth()+1).padStart(2,'0'),day:String(date.getDate()).padStart(2,'0'),hour:String(date.getHours()).padStart(2,'0'),minute:String(date.getMinutes()).padStart(2,'0')};
 }
}
function dayKey(date,timeZone){
 const p=zoneParts(date,timeZone);
 return `${p.year}-${p.month}-${p.day}`;
}
function localMinutes(date,timeZone){
 const p=zoneParts(date,timeZone);
 return Number(p.hour||0)*60+Number(p.minute||0);
}

export function useAdhkar({now,timeZone,fajrDate,nextFajrDate,eveningDate,nextEveningDate,language='ar'}){
 const [loaded,setLoaded]=useState(false);
 const [morningEnabled,setMorningEnabledState]=useState(true);
 const [eveningEnabled,setEveningEnabledState]=useState(true);
 const [alertsEnabled,setAlertsEnabledState]=useState(false);
 const [morningDone,setMorningDone]=useState('');
 const [eveningDone,setEveningDone]=useState('');
 const [openKind,setOpenKind]=useState(null);

 useEffect(()=>{
  Promise.all([
   AsyncStorage.getItem(MORNING_ENABLED_KEY),
   AsyncStorage.getItem(EVENING_ENABLED_KEY),
   AsyncStorage.getItem(ALERTS_KEY),
   AsyncStorage.getItem(MORNING_DONE_KEY),
   AsyncStorage.getItem(EVENING_DONE_KEY)
  ]).then(([m,e,a,md,ed])=>{
   setMorningEnabledState(m!=='0');
   setEveningEnabledState(e!=='0');
   setAlertsEnabledState(a==='1');
   setMorningDone(md||'');
   setEveningDone(ed||'');
   setLoaded(true);
  }).catch(()=>setLoaded(true));
 },[]);

 useEffect(()=>{
  const sub=Notifications.addNotificationResponseReceivedListener(response=>{
   const kind=response?.notification?.request?.content?.data?.kind;
   if(kind==='alofok-v3-adhkar-morning')setOpenKind('morning');
   if(kind==='alofok-v3-adhkar-evening')setOpenKind('evening');
  });
  return()=>sub.remove();
 },[]);

 const setMorningEnabled=useCallback(async enabled=>{
  setMorningEnabledState(Boolean(enabled));
  try{await AsyncStorage.setItem(MORNING_ENABLED_KEY,enabled?'1':'0')}catch(e){}
 },[]);
 const setEveningEnabled=useCallback(async enabled=>{
  setEveningEnabledState(Boolean(enabled));
  try{await AsyncStorage.setItem(EVENING_ENABLED_KEY,enabled?'1':'0')}catch(e){}
 },[]);
 const setAlertsEnabled=useCallback(async enabled=>{
  if(enabled){
   const current=await Notifications.getPermissionsAsync();
   const permission=current.status==='granted'?current:await Notifications.requestPermissionsAsync();
   if(permission.status!=='granted')return false;
  }
  setAlertsEnabledState(Boolean(enabled));
  try{await AsyncStorage.setItem(ALERTS_KEY,enabled?'1':'0')}catch(e){}
  return true;
 },[]);

 const today=dayKey(now,timeZone);
 const minutes=localMinutes(now,timeZone);
 const morningVisible=loaded&&morningEnabled&&fajrDate instanceof Date&&!Number.isNaN(fajrDate.getTime())&&now.getTime()>=fajrDate.getTime()&&minutes<600&&morningDone!==today;
 const eveningVisible=loaded&&eveningEnabled&&minutes>=1260&&minutes<1440&&eveningDone!==today;

 const markRead=useCallback(async kind=>{
  const key=dayKey(new Date(),timeZone);
  if(kind==='morning'){
   setMorningDone(key);
   try{await AsyncStorage.setItem(MORNING_DONE_KEY,key)}catch(e){}
  }else{
   setEveningDone(key);
   try{await AsyncStorage.setItem(EVENING_DONE_KEY,key)}catch(e){}
  }
 },[timeZone]);

 useEffect(()=>{
  if(!loaded)return;
  let cancelled=false;
  (async()=>{
   try{
    const scheduled=await Notifications.getAllScheduledNotificationsAsync();
    for(const n of scheduled){
     if(String(n.content?.data?.kind||'').startsWith('alofok-v3-adhkar-'))await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if(!alertsEnabled)return;
    const permission=await Notifications.getPermissionsAsync();
    if(permission.status!=='granted'||cancelled)return;

    const channelId='alofok-v3-adhkar';
    if(Platform.OS==='android'){
     await Notifications.setNotificationChannelAsync(channelId,{name:'Al-Ufuq — Adhkar',importance:Notifications.AndroidImportance.DEFAULT,vibrationPattern:[0,180,120,180],sound:'default'});
    }
    const ar=String(language||'').startsWith('ar');
    const candidates=[];
    if(morningEnabled){
     const date=fajrDate?.getTime()>Date.now()?fajrDate:nextFajrDate;
     if(date instanceof Date&&date.getTime()>Date.now())candidates.push({kind:'morning',date});
    }
    if(eveningEnabled){
     const date=eveningDate?.getTime()>Date.now()?eveningDate:nextEveningDate;
     if(date instanceof Date&&date.getTime()>Date.now())candidates.push({kind:'evening',date});
    }
    for(const item of candidates){
     const morning=item.kind==='morning';
     await Notifications.scheduleNotificationAsync({
      content:{
       title:ar?(morning?'أذكار الصباح':'أذكار المساء'):(morning?'Morning adhkar':'Evening adhkar'),
       body:ar?'وقت الأذكار. افتح الأفق للقراءة.':'It is time for adhkar. Open Al-Ufuq to read.',
       sound:'default',
       data:{kind:`alofok-v3-adhkar-${item.kind}`}
      },
      trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:item.date,channelId:Platform.OS==='android'?channelId:undefined}
     });
    }
   }catch(e){}
  })();
  return()=>{cancelled=true};
 },[loaded,alertsEnabled,morningEnabled,eveningEnabled,fajrDate?.getTime(),nextFajrDate?.getTime(),eveningDate?.getTime(),nextEveningDate?.getTime(),language]);

 return useMemo(()=>({
  loaded,morningEnabled,eveningEnabled,alertsEnabled,morningVisible,eveningVisible,openKind,
  setMorningEnabled,setEveningEnabled,setAlertsEnabled,markRead,clearOpenKind:()=>setOpenKind(null)
 }),[loaded,morningEnabled,eveningEnabled,alertsEnabled,morningVisible,eveningVisible,openKind,setMorningEnabled,setEveningEnabled,setAlertsEnabled,markRead]);
}
