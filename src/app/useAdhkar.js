import {useCallback,useEffect,useMemo,useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const MORNING_ENABLED_KEY='alofok_adhkar_morning_enabled';
const EVENING_ENABLED_KEY='alofok_adhkar_evening_enabled';
const MORNING_ALERT_KEY='alofok_adhkar_morning_alert';
const EVENING_ALERT_KEY='alofok_adhkar_evening_alert';
const MORNING_DONE_KEY='alofok_adhkar_morning_done';
const EVENING_DONE_KEY='alofok_adhkar_evening_done';

async function ensurePermission(){
 const current=await Notifications.getPermissionsAsync();
 if(current.status==='granted')return true;
 const requested=await Notifications.requestPermissionsAsync();
 return requested.status==='granted';
}

export function useAdhkar(){
 const [morningEnabled,setMorningEnabledState]=useState(true);
 const [eveningEnabled,setEveningEnabledState]=useState(true);
 const [morningAlert,setMorningAlertState]=useState(false);
 const [eveningAlert,setEveningAlertState]=useState(false);
 const [morningDone,setMorningDone]=useState('');
 const [eveningDone,setEveningDone]=useState('');

 useEffect(()=>{
  Promise.all([
   AsyncStorage.getItem(MORNING_ENABLED_KEY),
   AsyncStorage.getItem(EVENING_ENABLED_KEY),
   AsyncStorage.getItem(MORNING_ALERT_KEY),
   AsyncStorage.getItem(EVENING_ALERT_KEY),
   AsyncStorage.getItem(MORNING_DONE_KEY),
   AsyncStorage.getItem(EVENING_DONE_KEY)
  ]).then(([m,e,ma,ea,md,ed])=>{
   setMorningEnabledState(m!=='0');
   setEveningEnabledState(e!=='0');
   setMorningAlertState(ma==='1');
   setEveningAlertState(ea==='1');
   setMorningDone(md||'');
   setEveningDone(ed||'');
  }).catch(()=>{});
 },[]);

 const setMorningEnabled=useCallback(async enabled=>{
  setMorningEnabledState(enabled);
  await AsyncStorage.setItem(MORNING_ENABLED_KEY,enabled?'1':'0').catch(()=>{});
 },[]);

 const setEveningEnabled=useCallback(async enabled=>{
  setEveningEnabledState(enabled);
  await AsyncStorage.setItem(EVENING_ENABLED_KEY,enabled?'1':'0').catch(()=>{});
 },[]);

 const setMorningAlert=useCallback(async enabled=>{
  if(enabled&&!await ensurePermission())return false;
  setMorningAlertState(enabled);
  await AsyncStorage.setItem(MORNING_ALERT_KEY,enabled?'1':'0').catch(()=>{});
  return true;
 },[]);

 const setEveningAlert=useCallback(async enabled=>{
  if(enabled&&!await ensurePermission())return false;
  setEveningAlertState(enabled);
  await AsyncStorage.setItem(EVENING_ALERT_KEY,enabled?'1':'0').catch(()=>{});
  return true;
 },[]);

 const markDone=useCallback(async (kind,dateKey)=>{
  if(kind==='evening'){
   setEveningDone(dateKey);
   await AsyncStorage.setItem(EVENING_DONE_KEY,dateKey).catch(()=>{});
  }else{
   setMorningDone(dateKey);
   await AsyncStorage.setItem(MORNING_DONE_KEY,dateKey).catch(()=>{});
  }
 },[]);

 const isDone=useCallback((kind,dateKey)=>kind==='evening'?eveningDone===dateKey:morningDone===dateKey,[morningDone,eveningDone]);

 const schedule=useCallback(async ({morningDate,eveningDate,language='ar'})=>{
  try{
   const permission=await Notifications.getPermissionsAsync();
   const scheduled=await Notifications.getAllScheduledNotificationsAsync();
   for(const n of scheduled){
    if(n.content?.data?.kind==='alofok-adhkar')await Notifications.cancelScheduledNotificationAsync(n.identifier);
   }
   if(permission.status!=='granted')return;

   const channelId='alofok-adhkar';
   if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(channelId,{
     name:'Al-Ufuq — Adhkar',
     importance:Notifications.AndroidImportance.DEFAULT,
     vibrationPattern:[0,180,120,180],
     sound:'default'
    });
   }
   const ar=String(language).startsWith('ar');
   const items=[
    {slot:'morning',enabled:morningEnabled&&morningAlert,date:morningDate,title:ar?'أذكار الصباح':'Morning adhkar',body:ar?'أذكار الصباح جاهزة للقراءة.':'Morning adhkar are ready to read.'},
    {slot:'evening',enabled:eveningEnabled&&eveningAlert,date:eveningDate,title:ar?'أذكار المساء':'Evening adhkar',body:ar?'أذكار المساء جاهزة للقراءة.':'Evening adhkar are ready to read.'}
   ];
   for(const item of items){
    if(!item.enabled||!(item.date instanceof Date)||Number.isNaN(item.date.getTime())||item.date.getTime()<=Date.now())continue;
    await Notifications.scheduleNotificationAsync({
     content:{title:item.title,body:item.body,sound:'default',data:{kind:'alofok-adhkar',slot:item.slot}},
     trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:item.date,channelId:Platform.OS==='android'?channelId:undefined}
    });
   }
  }catch(_){}
 },[morningEnabled,eveningEnabled,morningAlert,eveningAlert]);

 return useMemo(()=>({
  morningEnabled,eveningEnabled,morningAlert,eveningAlert,
  setMorningEnabled,setEveningEnabled,setMorningAlert,setEveningAlert,
  markDone,isDone,schedule
 }),[morningEnabled,eveningEnabled,morningAlert,eveningAlert,setMorningEnabled,setEveningEnabled,setMorningAlert,setEveningAlert,markDone,isDone,schedule]);
}
