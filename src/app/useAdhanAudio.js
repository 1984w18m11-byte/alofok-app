import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Platform} from 'react-native';
import {createAudioPlayer} from 'expo-audio';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ADHAN_BY_ID,ADHAN_CATALOG,DEFAULT_ADHAN_ID} from './adhanCatalog';

const SELECTED_KEY='alofok_v3_adhan_id';
const ALERTS_KEY='alofok_v3_prayer_alerts';

Notifications.setNotificationHandler({
 handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})
});

export function useAdhanAudio(){
 const [selectedId,setSelectedId]=useState(DEFAULT_ADHAN_ID);
 const [alertsEnabled,setAlertsEnabled]=useState(false);
 const [playingId,setPlayingId]=useState(null);
 const [error,setError]=useState(null);
 const playerRef=useRef(null);

 useEffect(()=>{
  Promise.all([AsyncStorage.getItem(SELECTED_KEY),AsyncStorage.getItem(ALERTS_KEY)]).then(([id,alerts])=>{
   if(id&&ADHAN_BY_ID[id])setSelectedId(id);
   setAlertsEnabled(alerts==='1');
  }).catch(()=>{});
  return()=>{try{playerRef.current?.pause();playerRef.current?.release()}catch(e){}}
 },[]);

 const stop=useCallback(()=>{
  const player=playerRef.current;playerRef.current=null;
  try{player?.pause();player?.seekTo?.(0);player?.release()}catch(e){}
  setPlayingId(null);
 },[]);

 const preview=useCallback(async id=>{
  const item=ADHAN_BY_ID[id];
  if(!item?.audio){setError('ASSET_MISSING');return false;}
  try{
   stop();setError(null);
   const player=createAudioPlayer(item.audio);
   player.volume=0.9;
   playerRef.current=player;
   setPlayingId(id);
   player.play();
   return true;
  }catch(e){setError(e?.message||'PLAYBACK_ERROR');stop();return false;}
 },[stop]);

 const select=useCallback(async id=>{
  if(!ADHAN_BY_ID[id])return false;
  setSelectedId(id);setError(null);
  try{await AsyncStorage.setItem(SELECTED_KEY,id)}catch(e){}
  return true;
 },[]);

 const setPrayerAlerts=useCallback(async enabled=>{
  if(enabled){
   const current=await Notifications.getPermissionsAsync();
   const permission=current.status==='granted'?current:await Notifications.requestPermissionsAsync();
   if(permission.status!=='granted')return false;
  }
  setAlertsEnabled(enabled);
  try{await AsyncStorage.setItem(ALERTS_KEY,enabled?'1':'0')}catch(e){}
  return true;
 },[]);

 const schedulePrayerAlerts=useCallback(async ({dates,names,bodyPrefix='Adhan',language='en'})=>{
  try{
   const selected=ADHAN_BY_ID[selectedId];
   if(!alertsEnabled||!selected)return;
   const permission=await Notifications.getPermissionsAsync();
   if(permission.status!=='granted')return;
   const sound=selected.notificationSound||'default';
   const channelId=`alofok-v3-${selected.id.replace(/[^a-z0-9-]/gi,'-')}`;
   if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(channelId,{
     name:`AlofoK — ${selected.performer||'Adhan'}`,
     importance:Notifications.AndroidImportance.MAX,
     vibrationPattern:[0,250,180,250],sound
    });
   }
   const scheduled=await Notifications.getAllScheduledNotificationsAsync();
   for(const n of scheduled){if(n.content?.data?.kind==='alofok-v3-prayer')await Notifications.cancelScheduledNotificationAsync(n.identifier)}
   for(const [key,date] of Object.entries(dates||{})){
    if(!(date instanceof Date)||Number.isNaN(date.getTime())||date.getTime()<=Date.now())continue;
    const prayerName=names?.[key]||key;
    await Notifications.scheduleNotificationAsync({
     content:{
      title:language.startsWith('ar')?`حان وقت صلاة ${prayerName}`:`${prayerName} prayer time`,
      body:language.startsWith('ar')?`يعمل صوت الأذان المختار تلقائيًا.`:`${bodyPrefix} will play using the selected sound.`,
      sound,priority:Notifications.AndroidNotificationPriority.MAX,
      data:{kind:'alofok-v3-prayer',prayer:key,adhanId:selected.id}
     },
     trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date,channelId:Platform.OS==='android'?channelId:undefined}
    });
   }
  }catch(e){setError(e?.message||'SCHEDULE_ERROR')}
 },[alertsEnabled,selectedId]);

 return useMemo(()=>({catalog:ADHAN_CATALOG,selectedId,selected:ADHAN_BY_ID[selectedId],alertsEnabled,playingId,error,preview,stop,select,setPrayerAlerts,schedulePrayerAlerts}),[selectedId,alertsEnabled,playingId,error,preview,stop,select,setPrayerAlerts,schedulePrayerAlerts]);
}
