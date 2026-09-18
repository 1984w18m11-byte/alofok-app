import {useCallback,useEffect,useMemo,useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import adhkar from '../data/adhkar.json';

const MORNING_ENABLED_KEY='alofok_adhkar_morning_enabled';
const EVENING_ENABLED_KEY='alofok_adhkar_evening_enabled';
const ALERTS_KEY='alofok_adhkar_alerts_enabled';
const MORNING_DONE_KEY='alofok_adhkar_morning_done';
const EVENING_DONE_KEY='alofok_adhkar_evening_done';

function localParts(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return {key:`${v.year}-${v.month}-${v.day}`,minutes:Number(v.hour)*60+Number(v.minute)};
 }catch(_){
  return {key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,minutes:date.getHours()*60+date.getMinutes()};
 }
}

export function useAdhkar({now,fajrDate,eveningDate,timeZone,language='ar'}){
 const [morningEnabled,setMorningEnabledState]=useState(true);
 const [eveningEnabled,setEveningEnabledState]=useState(true);
 const [alertsEnabled,setAlertsEnabledState]=useState(false);
 const [morningDone,setMorningDone]=useState('');
 const [eveningDone,setEveningDone]=useState('');
 const [openedKind,setOpenedKind]=useState(null);

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
  }).catch(()=>{});
 },[]);

 useEffect(()=>{
  const sub=Notifications.addNotificationResponseReceivedListener(response=>{
   const kind=response?.notification?.request?.content?.data?.kind;
   if(kind==='alofok-adhkar-morning')setOpenedKind('morning');
   if(kind==='alofok-adhkar-evening')setOpenedKind('evening');
  });
  return()=>sub.remove();
 },[]);

 const setMorningEnabled=useCallback(async enabled=>{
  const value=Boolean(enabled);
  setMorningEnabledState(value);
  try{await AsyncStorage.setItem(MORNING_ENABLED_KEY,value?'1':'0')}catch(e){}
  return true;
 },[]);

 const setEveningEnabled=useCallback(async enabled=>{
  const value=Boolean(enabled);
  setEveningEnabledState(value);
  try{await AsyncStorage.setItem(EVENING_ENABLED_KEY,value?'1':'0')}catch(e){}
  return true;
 },[]);

 const setAlertsEnabled=useCallback(async enabled=>{
  const value=Boolean(enabled);
  if(value){
   const current=await Notifications.getPermissionsAsync();
   const permission=current.status==='granted'?current:await Notifications.requestPermissionsAsync();
   if(permission.status!=='granted')return false;
  }
  setAlertsEnabledState(value);
  try{await AsyncStorage.setItem(ALERTS_KEY,value?'1':'0')}catch(e){}
  return true;
 },[]);

 const complete=useCallback(async kind=>{
  const key=localParts(new Date(),timeZone).key;
  if(kind==='evening'){
   setEveningDone(key);
   try{await AsyncStorage.setItem(EVENING_DONE_KEY,key)}catch(e){}
  }else{
   setMorningDone(key);
   try{await AsyncStorage.setItem(MORNING_DONE_KEY,key)}catch(e){}
  }
 },[timeZone]);

 const local=useMemo(()=>localParts(now,timeZone),[now,timeZone]);
 const morningVisible=Boolean(
  morningEnabled&&morningDone!==local.key&&
  fajrDate instanceof Date&&!Number.isNaN(fajrDate.getTime())&&
  now.getTime()>=fajrDate.getTime()&&local.minutes<600
 );
 const eveningVisible=Boolean(
  eveningEnabled&&eveningDone!==local.key&&
  local.minutes>=1260&&local.minutes<1440
 );

 const schedule=useCallback(async()=>{
  try{
   const scheduled=await Notifications.getAllScheduledNotificationsAsync();
   for(const n of scheduled){
    const kind=n.content?.data?.kind;
    if(kind==='alofok-adhkar-morning'||kind==='alofok-adhkar-evening'){
     await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
   }
   if(!alertsEnabled)return;
   const permission=await Notifications.getPermissionsAsync();
   if(permission.status!=='granted')return;
   const channelId='alofok-adhkar';
   if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(channelId,{
     name:'Al-Ufuq — Adhkar',
     importance:Notifications.AndroidImportance.HIGH,
     vibrationPattern:[0,180,120,180],
     sound:'default'
    });
   }
   const ar=String(language).startsWith('ar');
   const queue=[];
   if(morningEnabled&&fajrDate instanceof Date&&!Number.isNaN(fajrDate.getTime())&&fajrDate.getTime()>Date.now()){
    queue.push({
     date:fajrDate,
     kind:'alofok-adhkar-morning',
     title:ar?'أذكار الصباح':'Morning Adhkar',
     body:ar?'حان وقت أذكار الصباح. افتح الأفق للقراءة.':'It is time for the morning Adhkar. Open Al-Ufuq to read.'
    });
   }
   if(eveningEnabled&&eveningDate instanceof Date&&!Number.isNaN(eveningDate.getTime())&&eveningDate.getTime()>Date.now()){
    queue.push({
     date:eveningDate,
     kind:'alofok-adhkar-evening',
     title:ar?'أذكار المساء':'Evening Adhkar',
     body:ar?'حان وقت أذكار المساء. افتح الأفق للقراءة.':'It is time for the evening Adhkar. Open Al-Ufuq to read.'
    });
   }
   for(const item of queue){
    await Notifications.scheduleNotificationAsync({
     content:{title:item.title,body:item.body,sound:'default',data:{kind:item.kind}},
     trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:item.date,channelId:Platform.OS==='android'?channelId:undefined}
    });
   }
  }catch(e){}
 },[alertsEnabled,morningEnabled,eveningEnabled,fajrDate?.getTime?.(),eveningDate?.getTime?.(),language]);

 useEffect(()=>{schedule()},[schedule]);

 return useMemo(()=>({
  morningEnabled,eveningEnabled,alertsEnabled,
  morningVisible,eveningVisible,
  setMorningEnabled,setEveningEnabled,setAlertsEnabled,
  complete,
  openedKind,
  clearOpened:()=>setOpenedKind(null),
  items:kind=>adhkar[kind]||[]
 }),[
  morningEnabled,eveningEnabled,alertsEnabled,morningVisible,eveningVisible,
  setMorningEnabled,setEveningEnabled,setAlertsEnabled,complete,openedKind
 ]);
}
