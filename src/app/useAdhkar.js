import {useCallback,useEffect,useMemo,useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const MORNING_ENABLED_KEY='alofok_adhkar_morning_enabled_v1';
const EVENING_ENABLED_KEY='alofok_adhkar_evening_enabled_v1';
const ALERTS_ENABLED_KEY='alofok_adhkar_alerts_enabled_v1';
const MORNING_DONE_KEY='alofok_adhkar_morning_done_v1';
const EVENING_DONE_KEY='alofok_adhkar_evening_done_v1';

function zoneParts(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return {
   year:Number(v.year),month:Number(v.month),day:Number(v.day),
   hour:Number(v.hour),minute:Number(v.minute),
   key:`${v.year}-${v.month}-${v.day}`
  };
 }catch(_){
  return {
   year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate(),
   hour:date.getHours(),minute:date.getMinutes(),
   key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  };
 }
}

function dateAtZoneClock(base,timeZone,hour,minute=0){
 const p=zoneParts(base,timeZone);
 const wallUtc=Date.UTC(p.year,p.month-1,p.day,hour,minute,0);
 let guess=new Date(wallUtc);
 for(let i=0;i<3;i++){
  const q=zoneParts(guess,timeZone);
  const represented=Date.UTC(q.year,q.month-1,q.day,q.hour,q.minute,0);
  guess=new Date(guess.getTime()+(wallUtc-represented));
 }
 return guess;
}

async function notificationPermission(){
 const current=await Notifications.getPermissionsAsync();
 if(current.status==='granted')return true;
 const next=await Notifications.requestPermissionsAsync();
 return next.status==='granted';
}

export function useAdhkar({now,fajrDate,timeZone='Asia/Baghdad',language='ar'}){
 const [morningEnabled,setMorningEnabledState]=useState(true);
 const [eveningEnabled,setEveningEnabledState]=useState(true);
 const [alertsEnabled,setAlertsEnabledState]=useState(false);
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
   AsyncStorage.getItem(ALERTS_ENABLED_KEY),
   AsyncStorage.getItem(MORNING_DONE_KEY),
   AsyncStorage.getItem(EVENING_DONE_KEY)
  ]).then(([m,e,a,md,ed])=>{
   if(!active)return;
   setMorningEnabledState(m!=='0');
   setEveningEnabledState(e!=='0');
   setAlertsEnabledState(a==='1');
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
  const value=Boolean(enabled);
  setMorningEnabledState(value);
  try{await AsyncStorage.setItem(MORNING_ENABLED_KEY,value?'1':'0')}catch(_){}
 },[]);

 const setEveningEnabled=useCallback(async enabled=>{
  const value=Boolean(enabled);
  setEveningEnabledState(value);
  try{await AsyncStorage.setItem(EVENING_ENABLED_KEY,value?'1':'0')}catch(_){}
 },[]);

 const setAlertsEnabled=useCallback(async enabled=>{
  const value=Boolean(enabled);
  if(value&&!(await notificationPermission()))return false;
  setAlertsEnabledState(value);
  try{await AsyncStorage.setItem(ALERTS_ENABLED_KEY,value?'1':'0')}catch(_){}
  return true;
 },[]);

 const markComplete=useCallback(async period=>{
  const key=zoneParts(new Date(),timeZone).key;
  if(period==='evening'){
   setEveningDone(key);
   try{await AsyncStorage.setItem(EVENING_DONE_KEY,key)}catch(_){}
  }else{
   setMorningDone(key);
   try{await AsyncStorage.setItem(MORNING_DONE_KEY,key)}catch(_){}
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
    const scheduled=await Notifications.getAllScheduledNotificationsAsync();
    for(const n of scheduled){
     if(n.content?.data?.kind==='alofok-adhkar')await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if(!alertsEnabled)return;
    const permission=await Notifications.getPermissionsAsync();
    if(permission.status!=='granted')return;

    const channelId='alofok-adhkar-reminders';
    if(Platform.OS==='android'){
     await Notifications.setNotificationChannelAsync(channelId,{
      name:'Al-Ufuq — Adhkar',
      importance:Notifications.AndroidImportance.DEFAULT,
      vibrationPattern:[0,180,120,180],
      sound:'default'
     });
    }

    const ar=String(language).startsWith('ar');
    const scheduleOne=async(period,date)=>{
     if(cancelled||!(date instanceof Date)||Number.isNaN(date.getTime())||date.getTime()<=Date.now())return;
     const morning=period==='morning';
     await Notifications.scheduleNotificationAsync({
      content:{
       title:ar?(morning?'أذكار الصباح':'أذكار المساء'):(morning?'Morning adhkar':'Evening adhkar'),
       body:ar?'حان وقت الأذكار. افتح تطبيق الأفق للقراءة.':'It is time for adhkar. Open Al-Ufuq to read.',
       sound:'default',
       data:{kind:'alofok-adhkar',period}
      },
      trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date,channelId:Platform.OS==='android'?channelId:undefined}
     });
    };

    if(morningEnabled&&morningDone!==local.key&&fajrDate instanceof Date){
     await scheduleOne('morning',new Date(fajrDate.getTime()+60000));
    }
    if(eveningEnabled&&eveningDone!==local.key){
     await scheduleOne('evening',dateAtZoneClock(now,timeZone,21,0));
    }
   }catch(_){}
  })();
  return()=>{cancelled=true};
 },[ready,alertsEnabled,morningEnabled,eveningEnabled,morningDone,eveningDone,local.key,fajrDate?.getTime?.(),timeZone,language]);

 const clearOpened=useCallback(()=>setOpenedKind(null),[]);

 return useMemo(()=>({
  morningEnabled,eveningEnabled,alertsEnabled,
  morningVisible,eveningVisible,visibleKind,
  setMorningEnabled,setEveningEnabled,setAlertsEnabled,
  markComplete,openedKind,clearOpened
 }),[
  morningEnabled,eveningEnabled,alertsEnabled,morningVisible,eveningVisible,visibleKind,
  setMorningEnabled,setEveningEnabled,setAlertsEnabled,markComplete,openedKind,clearOpened
 ]);
}
