import {useCallback,useEffect,useMemo,useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const MORNING_ENABLED_KEY='alofok_adhkar_morning_enabled';
const EVENING_ENABLED_KEY='alofok_adhkar_evening_enabled';
const ALERTS_KEY='alofok_adhkar_alerts_enabled';
const MORNING_DONE_KEY='alofok_adhkar_morning_done_date';
const EVENING_DONE_KEY='alofok_adhkar_evening_done_date';

function localParts(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return {year:+v.year,month:+v.month,day:+v.day,hour:+v.hour,minute:+v.minute};
 }catch(_){
  return {year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate(),hour:date.getHours(),minute:date.getMinutes()};
 }
}
function dayKey(date,timeZone){
 const p=localParts(date,timeZone);
 return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
}

export function useAdhkar({now,fajrDate,timeZone='UTC'}){
 const [morningEnabled,setMorningEnabledState]=useState(true);
 const [eveningEnabled,setEveningEnabledState]=useState(true);
 const [alertsEnabled,setAlertsEnabledState]=useState(false);
 const [morningDoneDate,setMorningDoneDate]=useState('');
 const [eveningDoneDate,setEveningDoneDate]=useState('');
 const [pendingOpen,setPendingOpen]=useState(null);
 const [loaded,setLoaded]=useState(false);

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
   setMorningDoneDate(md||'');
   setEveningDoneDate(ed||'');
   setLoaded(true);
  }).catch(()=>setLoaded(true));
 },[]);

 useEffect(()=>{
  const sub=Notifications.addNotificationResponseReceivedListener(response=>{
   const data=response?.notification?.request?.content?.data||{};
   if(data.kind==='alofok-adhkar'&&(data.period==='morning'||data.period==='evening'))setPendingOpen(data.period);
  });
  return()=>sub.remove();
 },[]);

 const setMorningEnabled=useCallback(async enabled=>{
  setMorningEnabledState(enabled);
  try{await AsyncStorage.setItem(MORNING_ENABLED_KEY,enabled?'1':'0')}catch(_){}
 },[]);

 const setEveningEnabled=useCallback(async enabled=>{
  setEveningEnabledState(enabled);
  try{await AsyncStorage.setItem(EVENING_ENABLED_KEY,enabled?'1':'0')}catch(_){}
 },[]);

 const setAlertsEnabled=useCallback(async enabled=>{
  if(enabled){
   const current=await Notifications.getPermissionsAsync();
   const permission=current.status==='granted'?current:await Notifications.requestPermissionsAsync();
   if(permission.status!=='granted'){
    setAlertsEnabledState(false);
    try{await AsyncStorage.setItem(ALERTS_KEY,'0')}catch(_){}
    return false;
   }
  }
  setAlertsEnabledState(enabled);
  try{await AsyncStorage.setItem(ALERTS_KEY,enabled?'1':'0')}catch(_){}
  return true;
 },[]);

 const markDone=useCallback(async period=>{
  const key=dayKey(new Date(),timeZone);
  if(period==='morning'){
   setMorningDoneDate(key);
   try{await AsyncStorage.setItem(MORNING_DONE_KEY,key)}catch(_){}
  }else{
   setEveningDoneDate(key);
   try{await AsyncStorage.setItem(EVENING_DONE_KEY,key)}catch(_){}
  }
 },[timeZone]);

 const clearPendingOpen=useCallback(()=>setPendingOpen(null),[]);

 const state=useMemo(()=>{
  const p=localParts(now,timeZone);
  const key=`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
  const localMinutes=p.hour*60+p.minute;
  const morningEnd=10*60;
  const eveningStart=21*60;
  const fajrPassed=fajrDate instanceof Date&&!Number.isNaN(fajrDate.getTime())&&now.getTime()>=fajrDate.getTime();
  const morningVisible=loaded&&morningEnabled&&fajrPassed&&localMinutes<morningEnd&&morningDoneDate!==key;
  const eveningVisible=loaded&&eveningEnabled&&localMinutes>=eveningStart&&localMinutes<24*60&&eveningDoneDate!==key;
  return {key,morningVisible,eveningVisible,visiblePeriod:morningVisible?'morning':eveningVisible?'evening':null};
 },[now,fajrDate,timeZone,loaded,morningEnabled,eveningEnabled,morningDoneDate,eveningDoneDate]);

 const scheduleNotifications=useCallback(async ({morningDates=[],eveningDates=[],language='ar'}={})=>{
  try{
   const scheduled=await Notifications.getAllScheduledNotificationsAsync();
   for(const item of scheduled){
    if(item.content?.data?.kind==='alofok-adhkar')await Notifications.cancelScheduledNotificationAsync(item.identifier);
   }
   if(!alertsEnabled)return;
   const permission=await Notifications.getPermissionsAsync();
   if(permission.status!=='granted')return;
   const channelId='alofok-adhkar';
   if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(channelId,{
     name:language.startsWith('ar')?'أذكار الصباح والمساء':'Morning and evening adhkar',
     importance:Notifications.AndroidImportance.DEFAULT,
     vibrationPattern:[0,180,100,180],
     sound:'default'
    });
   }
   const scheduleOne=async(period,date)=>{
    if(!(date instanceof Date)||Number.isNaN(date.getTime())||date.getTime()<=Date.now())return;
    const isAr=language.startsWith('ar');
    const morning=period==='morning';
    await Notifications.scheduleNotificationAsync({
     content:{
      title:isAr?(morning?'أذكار الصباح':'أذكار المساء'):(morning?'Morning adhkar':'Evening adhkar'),
      body:isAr?(morning?'حان وقت أذكار الصباح. تظهر في الواجهة حتى الساعة 10:00 صباحًا.':'حان وقت أذكار المساء. تظهر في الواجهة حتى الساعة 12:00 ليلًا.'):(morning?'It is time for morning adhkar.':'It is time for evening adhkar.'),
      sound:'default',
      data:{kind:'alofok-adhkar',period}
     },
     trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date,channelId:Platform.OS==='android'?channelId:undefined}
    });
   };
   if(morningEnabled)for(const date of morningDates)await scheduleOne('morning',date);
   if(eveningEnabled)for(const date of eveningDates)await scheduleOne('evening',date);
  }catch(_){}
 },[alertsEnabled,morningEnabled,eveningEnabled]);

 return {
  loaded,
  morningEnabled,
  eveningEnabled,
  alertsEnabled,
  setMorningEnabled,
  setEveningEnabled,
  setAlertsEnabled,
  markDone,
  pendingOpen,
  clearPendingOpen,
  scheduleNotifications,
  ...state
 };
}
