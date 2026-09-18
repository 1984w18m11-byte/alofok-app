import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Platform,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {calculatePrayerTimes} from '../engine/prayer';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.92)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';

const SETTINGS_KEY='alofok_v3_adhkar_settings_v2';
const DONE_KEY='alofok_v3_adhkar_done_v2';
const IDS_KEY='alofok_v3_adhkar_notification_ids_v2';

const DEFAULT_SETTINGS={
 morningEnabled:true,
 eveningEnabled:true,
 morningAlert:false,
 eveningAlert:false
};

export const MORNING_ADHKAR=[
 {title:'آية الكرسي',text:'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ.',count:'مرة واحدة'},
 {title:'سورة الإخلاص',text:'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ.',count:'3 مرات'},
 {title:'سورة الفلق',text:'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ.',count:'3 مرات'},
 {title:'سورة الناس',text:'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ.',count:'3 مرات'},
 {title:'ذكر الصباح',text:'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. رب أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده.',count:'مرة واحدة'},
 {title:'اللهم بك أصبحنا',text:'اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.',count:'مرة واحدة'},
 {title:'رضيت بالله',text:'رضيت بالله ربًّا، وبالإسلام دينًا، وبمحمد ﷺ نبيًّا.',count:'3 مرات'},
 {title:'بسم الله الذي لا يضر',text:'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.',count:'3 مرات'},
 {title:'سيد الاستغفار',text:'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي، فاغفر لي فإنه لا يغفر الذنوب إلا أنت.',count:'مرة واحدة'},
 {title:'التسبيح',text:'سبحان الله وبحمده.',count:'100 مرة'}
];

export const EVENING_ADHKAR=[
 ...MORNING_ADHKAR.slice(0,4),
 {title:'ذكر المساء',text:'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. رب أسألك خير ما في هذه الليلة وخير ما بعدها، وأعوذ بك من شر ما في هذه الليلة وشر ما بعدها.',count:'مرة واحدة'},
 {title:'اللهم بك أمسينا',text:'اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.',count:'مرة واحدة'},
 ...MORNING_ADHKAR.slice(6)
];

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
  const represented=Date.UTC(+v.year,+v.month-1,+v.day,+v.hour,+v.minute,+v.second);
  return Math.round((represented-date.getTime())/60000);
 }catch(_){return -date.getTimezoneOffset()}
}
function dateKey(date,timeZone){return zoneParts(date,timeZone).key}
function addLocalDays(parts,days){
 const d=new Date(Date.UTC(parts.year,parts.month-1,parts.day+days,12));
 return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),key:`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`};
}
function localClockInstant(parts,timeZone,hour,minute=0){
 const wall=Date.UTC(parts.year,parts.month-1,parts.day,hour,minute,0);
 let guess=new Date(wall);
 let off=offsetMinutes(guess,timeZone);
 let actual=new Date(wall-off*60000);
 const off2=offsetMinutes(actual,timeZone);
 if(off2!==off)actual=new Date(wall-off2*60000);
 return actual;
}
function fajrInstant(parts,timeZone,lat,lon){
 const civil=new Date(Date.UTC(parts.year,parts.month-1,parts.day,12));
 const off=offsetMinutes(civil,timeZone);
 const result=calculatePrayerTimes({date:civil,lat,lon,tzOffsetMin:off,method:'MWL',clockLanguage:'en'});
 const minutes=result?.rawMinutesUtc?.fajr;
 if(minutes==null)return null;
 return new Date(Date.UTC(parts.year,parts.month-1,parts.day,0,0,0)+minutes*60000);
}
async function readJson(key,fallback){
 try{
  const raw=await AsyncStorage.getItem(key);
  return raw?{...fallback,...JSON.parse(raw)}:fallback;
 }catch(_){return fallback}
}
async function writeJson(key,value){try{await AsyncStorage.setItem(key,JSON.stringify(value))}catch(_){}}

export function useAdhkar({now=new Date(),fajrDate=null,timeZone='Asia/Baghdad',lat=33.3152,lon=44.3661,language='ar'}={}){
 const [settings,setSettings]=useState(DEFAULT_SETTINGS);
 const [done,setDone]=useState({});
 const [ready,setReady]=useState(false);
 const [openedKind,setOpenedKind]=useState(null);

 useEffect(()=>{
  let active=true;
  Promise.all([readJson(SETTINGS_KEY,DEFAULT_SETTINGS),readJson(DONE_KEY,{})]).then(([s,d])=>{
   if(!active)return;
   setSettings(s);setDone(d);setReady(true);
  });
  return()=>{active=false};
 },[]);

 useEffect(()=>{
  const sub=Notifications.addNotificationResponseReceivedListener(response=>{
   const data=response?.notification?.request?.content?.data;
   if(data?.kind==='alofok-v3-adhkar'&&(data?.period==='morning'||data?.period==='evening'))setOpenedKind(data.period);
  });
  return()=>sub.remove();
 },[]);

 const today=dateKey(now,timeZone);
 const p=zoneParts(now,timeZone);
 const localMinutes=p.hour*60+p.minute;
 const morningDone=done.morning===today;
 const eveningDone=done.evening===today;

 const visibleKind=useMemo(()=>{
  if(!ready)return null;
  if(settings.morningEnabled&&!morningDone&&fajrDate instanceof Date&&!Number.isNaN(fajrDate.getTime())&&now.getTime()>=fajrDate.getTime()&&localMinutes<600)return 'morning';
  if(settings.eveningEnabled&&!eveningDone&&localMinutes>=1260&&localMinutes<1440)return 'evening';
  return null;
 },[ready,settings.morningEnabled,settings.eveningEnabled,morningDone,eveningDone,fajrDate?.getTime?.(),now.getTime(),localMinutes]);

 const updateSetting=useCallback(async(key,value)=>{
  setSettings(prev=>{
   const next={...prev,[key]:value};
   writeJson(SETTINGS_KEY,next);
   return next;
  });
 },[]);

 const markComplete=useCallback(async kind=>{
  const key=dateKey(new Date(),timeZone);
  setDone(prev=>{
   const next={...prev,[kind]:key};
   writeJson(DONE_KEY,next);
   return next;
  });
 },[timeZone]);

 const clearOpened=useCallback(()=>setOpenedKind(null),[]);

 const schedule=useCallback(async()=>{
  try{
   const previous=await readJson(IDS_KEY,{ids:[]});
   await Promise.all((previous.ids||[]).map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})));
   const wantsMorning=settings.morningEnabled&&settings.morningAlert;
   const wantsEvening=settings.eveningEnabled&&settings.eveningAlert;
   if(!wantsMorning&&!wantsEvening){await writeJson(IDS_KEY,{ids:[]});return}

   const currentPerm=await Notifications.getPermissionsAsync();
   let granted=currentPerm.status==='granted'||currentPerm.granted===true;
   if(!granted){
    const requested=await Notifications.requestPermissionsAsync();
    granted=requested.status==='granted'||requested.granted===true;
   }
   if(!granted)return;

   const channelId='alofok-v3-adhkar';
   if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(channelId,{name:'Al-Ufuq — أذكار',importance:Notifications.AndroidImportance.DEFAULT,vibrationPattern:[0,180,120,180],sound:'default'});
   }

   const ids=[];
   const base=zoneParts(new Date(),timeZone);
   for(let i=0;i<14;i++){
    const day=addLocalDays(base,i);
    if(wantsMorning){
     const fajr=fajrInstant(day,timeZone,lat,lon);
     if(fajr){
      const triggerDate=new Date(fajr.getTime()+60000);
      if(triggerDate.getTime()>Date.now()+5000){
       const id=await Notifications.scheduleNotificationAsync({
        content:{title:language.startsWith('ar')?'أذكار الصباح':'Morning adhkar',body:language.startsWith('ar')?'حان وقت أذكار الصباح. افتح الأفق للقراءة.':'It is time for morning adhkar. Open Al-Ufuq to read.',sound:'default',data:{kind:'alofok-v3-adhkar',period:'morning'}},
        trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:triggerDate,channelId:Platform.OS==='android'?channelId:undefined}
       });
       ids.push(id);
      }
     }
    }
    if(wantsEvening){
     const triggerDate=localClockInstant(day,timeZone,21,0);
     if(triggerDate.getTime()>Date.now()+5000){
      const id=await Notifications.scheduleNotificationAsync({
       content:{title:language.startsWith('ar')?'أذكار المساء':'Evening adhkar',body:language.startsWith('ar')?'حان وقت أذكار المساء. افتح الأفق للقراءة.':'It is time for evening adhkar. Open Al-Ufuq to read.',sound:'default',data:{kind:'alofok-v3-adhkar',period:'evening'}},
       trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:triggerDate,channelId:Platform.OS==='android'?channelId:undefined}
      });
      ids.push(id);
     }
    }
   }
   await writeJson(IDS_KEY,{ids});
  }catch(_){}
 },[settings.morningEnabled,settings.eveningEnabled,settings.morningAlert,settings.eveningAlert,timeZone,lat,lon,language,today]);

 return useMemo(()=>({
  morningEnabled:settings.morningEnabled,
  eveningEnabled:settings.eveningEnabled,
  morningAlert:settings.morningAlert,
  eveningAlert:settings.eveningAlert,
  setMorningEnabled:value=>updateSetting('morningEnabled',value),
  setEveningEnabled:value=>updateSetting('eveningEnabled',value),
  setMorningAlert:value=>updateSetting('morningAlert',value),
  setEveningAlert:value=>updateSetting('eveningAlert',value),
  visibleKind,markComplete,schedule,openedKind,clearOpened
 }),[settings,visibleKind,markComplete,schedule,openedKind,clearOpened,updateSetting]);
}

export function AdhkarHomeCard({kind,rtl,onPress}){
 const morning=kind==='morning';
 return <Pressable onPress={onPress} style={s.homeCard}>
  <View style={s.homeIcon}><Text style={s.homeIconText}>{morning?'☀':'☾'}</Text></View>
  <View style={{flex:1}}>
   <Text style={[s.homeTitle,{textAlign:rtl?'right':'left'}]}>{rtl?(morning?'أذكار الصباح':'أذكار المساء'):(morning?'Morning adhkar':'Evening adhkar')}</Text>
   <Text style={[s.homeHint,{textAlign:rtl?'right':'left'}]}>{rtl?(morning?'متاحة حتى الساعة 10:00 صباحًا':'متاحة حتى الساعة 12:00 منتصف الليل'):(morning?'Available until 10:00 AM':'Available until midnight')}</Text>
  </View>
  <Text style={s.chevron}>{rtl?'‹':'›'}</Text>
 </Pressable>
}

function SettingRow({rtl,title,hint,value,onChange}){
 return <View style={s.settingCard}><View style={[s.settingRow,{flexDirection:rtl?'row-reverse':'row'}]}><View style={{flex:1}}><Text style={[s.settingTitle,{textAlign:rtl?'right':'left'}]}>{title}</Text><Text style={[s.settingHint,{textAlign:rtl?'right':'left'}]}>{hint}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{false:'#38495B',true:'#A87B28'}} thumbColor={value?GOLD:'#E8EDF2'}/></View></View>
}

export function AdhkarSettings({rtl,adhkar}){
 return <View style={s.settingsWrap}>
  <Text style={[s.settingsHeading,{textAlign:rtl?'right':'left'}]}>{rtl?'أذكار الصباح والمساء':'Morning & evening adhkar'}</Text>
  <SettingRow rtl={rtl} title={rtl?'أذكار الصباح':'Morning adhkar'} hint={rtl?'بعد الفجر حتى 10:00 صباحًا':'After Fajr until 10:00 AM'} value={adhkar.morningEnabled} onChange={adhkar.setMorningEnabled}/>
  <SettingRow rtl={rtl} title={rtl?'تنبيه أذكار الصباح':'Morning reminder'} hint={rtl?'إشعار بعد أذان الفجر':'Notification after Fajr'} value={adhkar.morningAlert} onChange={adhkar.setMorningAlert}/>
  <SettingRow rtl={rtl} title={rtl?'أذكار المساء':'Evening adhkar'} hint={rtl?'من 9:00 مساءً حتى 12:00 منتصف الليل':'9:00 PM until midnight'} value={adhkar.eveningEnabled} onChange={adhkar.setEveningEnabled}/>
  <SettingRow rtl={rtl} title={rtl?'تنبيه أذكار المساء':'Evening reminder'} hint={rtl?'إشعار الساعة 9:00 مساءً':'Notification at 9:00 PM'} value={adhkar.eveningAlert} onChange={adhkar.setEveningAlert}/>
 </View>
}

export function AdhkarScreen({kind,rtl,onBack,onComplete}){
 const morning=kind==='morning';
 const items=morning?MORNING_ADHKAR:EVENING_ADHKAR;
 const finish=async()=>{await onComplete(kind);onBack();};
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <View style={[s.header,{flexDirection:rtl?'row-reverse':'row'}]}>
   <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>{rtl?'›':'‹'}</Text></Pressable>
   <Text style={[s.title,{textAlign:rtl?'right':'left'}]}>{rtl?(morning?'أذكار الصباح':'أذكار المساء'):(morning?'Morning adhkar':'Evening adhkar')}</Text>
   <View style={{width:44}}/>
  </View>
  {items.map((item,index)=><View key={index} style={s.dhikrCard}>
   <View style={[s.dhikrTop,{flexDirection:rtl?'row-reverse':'row'}]}><Text style={[s.dhikrTitle,{textAlign:rtl?'right':'left'}]}>{item.title}</Text><Text style={s.count}>{item.count}</Text></View>
   <Text selectable style={s.dhikrText}>{item.text}</Text>
  </View>)}
  <Pressable onPress={finish} style={s.doneButton}><Text style={s.doneText}>{rtl?'تمت القراءة — إخفاء':'Finished — hide'}</Text></Pressable>
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:50},
 header:{height:60,alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},backText:{color:WHITE,fontSize:30},title:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},
 homeCard:{marginTop:12,minHeight:76,borderRadius:18,borderWidth:1,borderColor:'rgba(244,196,93,.55)',backgroundColor:'rgba(7,23,41,.88)',paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:12},
 homeIcon:{width:42,height:42,borderRadius:21,backgroundColor:'rgba(244,196,93,.14)',borderWidth:1,borderColor:GOLD,alignItems:'center',justifyContent:'center'},homeIconText:{color:GOLD,fontSize:22},homeTitle:{color:GOLD,fontSize:17,fontWeight:'900'},homeHint:{color:MUTED,fontSize:11,marginTop:4},chevron:{color:WHITE,fontSize:26},
 settingsWrap:{gap:10,marginTop:10},settingsHeading:{color:GOLD,fontSize:17,fontWeight:'900',marginTop:4},settingCard:{backgroundColor:CARD,borderRadius:16,borderWidth:1,borderColor:LINE,padding:14},settingRow:{alignItems:'center',gap:12},settingTitle:{color:WHITE,fontSize:15,fontWeight:'800'},settingHint:{color:MUTED,fontSize:11,marginTop:4},
 dhikrCard:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:15,marginTop:12},dhikrTop:{alignItems:'center',justifyContent:'space-between',gap:8},dhikrTitle:{color:GOLD,fontSize:16,fontWeight:'900',flex:1},count:{color:MUTED,fontSize:11},dhikrText:{color:WHITE,fontSize:18,lineHeight:34,textAlign:'right',writingDirection:'rtl',marginTop:12},
 doneButton:{backgroundColor:GOLD,borderRadius:15,paddingVertical:15,alignItems:'center',marginTop:18},doneText:{color:NAVY,fontSize:15,fontWeight:'900'}
});
