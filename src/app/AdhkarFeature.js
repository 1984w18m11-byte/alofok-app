import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Platform,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.92)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';

const MORNING_ENABLED_KEY='alofok_v3_adhkar_morning_enabled';
const EVENING_ENABLED_KEY='alofok_v3_adhkar_evening_enabled';
const ALERTS_KEY='alofok_v3_adhkar_alerts_enabled';
const MORNING_DONE_KEY='alofok_v3_adhkar_morning_done';
const EVENING_DONE_KEY='alofok_v3_adhkar_evening_done';

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
  return {year:+v.year,month:+v.month,day:+v.day,hour:+v.hour,minute:+v.minute};
 }catch(_){
  return {year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate(),hour:date.getHours(),minute:date.getMinutes()};
 }
}
function dateKey(date,timeZone){
 const p=zoneParts(date,timeZone);
 return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
}
function isMorningWindow(now,fajrDate,timeZone){
 if(!(fajrDate instanceof Date)||Number.isNaN(fajrDate.getTime()))return false;
 const p=zoneParts(now,timeZone);
 return now.getTime()>=fajrDate.getTime()&&p.hour<10;
}
function isEveningWindow(now,timeZone){
 const p=zoneParts(now,timeZone);
 return p.hour>=21&&p.hour<24;
}
async function ensurePermission(){
 const current=await Notifications.getPermissionsAsync();
 if(current.status==='granted')return true;
 const next=await Notifications.requestPermissionsAsync();
 return next.status==='granted';
}

export function useAdhkar({now=new Date(),fajrDate=null,timeZone='Asia/Baghdad',language='ar'}={}){
 const [morningEnabled,setMorningEnabledState]=useState(true);
 const [eveningEnabled,setEveningEnabledState]=useState(true);
 const [alertsEnabled,setAlertsEnabledState]=useState(false);
 const [morningDone,setMorningDone]=useState('');
 const [eveningDone,setEveningDone]=useState('');
 const [openKind,setOpenKind]=useState(null);
 const [ready,setReady]=useState(false);
 const [openedKind,setOpenedKind]=useState(null);
 const today=dateKey(now,timeZone);

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
   setReady(true);
  }).catch(()=>setReady(true));
 },[]);

 useEffect(()=>{
  let mounted=true;
  const openFromResponse=response=>{
   const data=response?.notification?.request?.content?.data||{};
   if(data.kind==='alofok-v3-adhkar'&&(data.period==='morning'||data.period==='evening')&&mounted)setOpenKind(data.period);
  };
  const sub=Notifications.addNotificationResponseReceivedListener(openFromResponse);
  Notifications.getLastNotificationResponseAsync().then(openFromResponse).catch(()=>{});
  return()=>{mounted=false;sub.remove()};
 },[]);

 const setMorningEnabled=useCallback(async enabled=>{
  setMorningEnabledState(Boolean(enabled));
  try{await AsyncStorage.setItem(MORNING_ENABLED_KEY,enabled?'1':'0')}catch(e){}
  return true;
 },[]);
 const setEveningEnabled=useCallback(async enabled=>{
  setEveningEnabledState(Boolean(enabled));
  try{await AsyncStorage.setItem(EVENING_ENABLED_KEY,enabled?'1':'0')}catch(e){}
  return true;
 },[]);
 const setAlertsEnabled=useCallback(async enabled=>{
  if(enabled&&!(await ensurePermission()))return false;
  setAlertsEnabledState(Boolean(enabled));
  try{await AsyncStorage.setItem(ALERTS_KEY,enabled?'1':'0')}catch(e){}
  return true;
 },[]);

 const markComplete=useCallback(async kind=>{
  const key=dateKey(new Date(),timeZone);
  if(kind==='morning'){
   setMorningDone(key);await AsyncStorage.setItem(MORNING_DONE_KEY,key).catch(()=>{});
  }else if(kind==='evening'){
   setEveningDone(key);await AsyncStorage.setItem(EVENING_DONE_KEY,key).catch(()=>{});
  }
 },[timeZone]);

 const visibleKind=useMemo(()=>{
  if(!ready)return null;
  if(morningEnabled&&morningDone!==today&&isMorningWindow(now,fajrDate,timeZone))return 'morning';
  if(eveningEnabled&&eveningDone!==today&&isEveningWindow(now,timeZone))return 'evening';
  return null;
 },[ready,morningEnabled,eveningEnabled,morningDone,eveningDone,today,now,fajrDate,timeZone]);

 const schedule=useCallback(async({morningDate,nextMorningDate,eveningDate,nextEveningDate}={})=>{
  try{
   const scheduled=await Notifications.getAllScheduledNotificationsAsync();
   for(const n of scheduled){
    if(n.content?.data?.kind==='alofok-v3-adhkar')await Notifications.cancelScheduledNotificationAsync(n.identifier);
   }
   if(!alertsEnabled)return;
   const permission=await Notifications.getPermissionsAsync();
   if(permission.status!=='granted')return;

   const channelId='alofok-v3-adhkar';
   if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(channelId,{name:'Al-Ufuq — أذكار',importance:Notifications.AndroidImportance.HIGH,vibrationPattern:[0,180,120,180],sound:'default'});
   }
   const current=Date.now();
   const arabic=String(language||'').toLowerCase().startsWith('ar');
   const jobs=[];
   if(morningEnabled){
    const d=morningDate instanceof Date&&morningDate.getTime()>current?morningDate:nextMorningDate;
    if(d instanceof Date&&d.getTime()>current)jobs.push({period:'morning',date:new Date(d.getTime()+60000)});
   }
   if(eveningEnabled){
    const d=eveningDate instanceof Date&&eveningDate.getTime()>current?eveningDate:nextEveningDate;
    if(d instanceof Date&&d.getTime()>current)jobs.push({period:'evening',date:d});
   }
   for(const job of jobs){
    const morning=job.period==='morning';
    await Notifications.scheduleNotificationAsync({
     content:{
      title:arabic?(morning?'أذكار الصباح':'أذكار المساء'):(morning?'Morning adhkar':'Evening adhkar'),
      body:arabic?(morning?'حان وقت أذكار الصباح. متاحة حتى الساعة 10:00 صباحًا.':'حان وقت أذكار المساء. متاحة حتى الساعة 12:00 ليلًا.'):(morning?'Morning adhkar are ready until 10:00 AM.':'Evening adhkar are ready until midnight.'),
      sound:'default',
      data:{kind:'alofok-v3-adhkar',period:job.period}
     },
     trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:job.date,channelId:Platform.OS==='android'?channelId:undefined}
    });
   }
  }catch(_){}
 },[alertsEnabled,morningEnabled,eveningEnabled,language]);

 const clearOpenKind=useCallback(()=>setOpenKind(null),[]);

 return useMemo(()=>({
  morningEnabled,eveningEnabled,alertsEnabled,visibleKind,openKind,
  setMorningEnabled,setEveningEnabled,setAlertsEnabled,markComplete,schedule,clearOpenKind
 }),[morningEnabled,eveningEnabled,alertsEnabled,visibleKind,openKind,setMorningEnabled,setEveningEnabled,setAlertsEnabled,markComplete,schedule,clearOpenKind]);
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

export function AdhkarSettings({rtl,adhkar}){
 const row=(title,hint,value,onValueChange)=><View style={s.settingCard}><View style={[s.settingRow,{flexDirection:rtl?'row-reverse':'row'}]}><View style={{flex:1}}><Text style={[s.settingTitle,{textAlign:rtl?'right':'left'}]}>{title}</Text><Text style={[s.settingHint,{textAlign:rtl?'right':'left'}]}>{hint}</Text></View><Switch value={value} onValueChange={onValueChange} trackColor={{false:'#38495B',true:'#A87B28'}} thumbColor={value?GOLD:'#E8EDF2'}/></View></View>;
 return <View style={s.settingsWrap}>
  {row(rtl?'أذكار الصباح':'Morning adhkar',rtl?'بعد الفجر حتى 10:00 صباحًا':'After Fajr until 10:00 AM',adhkar.morningEnabled,adhkar.setMorningEnabled)}
  {row(rtl?'أذكار المساء':'Evening adhkar',rtl?'من 9:00 مساءً حتى 12:00 ليلًا':'9:00 PM until midnight',adhkar.eveningEnabled,adhkar.setEveningEnabled)}
  {row(rtl?'تنبيه الأذكار':'Adhkar reminders',rtl?'تنبيه مستقل لأذكار الصباح والمساء':'Separate morning and evening reminder',adhkar.alertsEnabled,adhkar.setAlertsEnabled)}
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
 settingsWrap:{gap:10,marginTop:10},settingCard:{backgroundColor:CARD,borderRadius:16,borderWidth:1,borderColor:LINE,padding:14},settingRow:{alignItems:'center',gap:12},settingTitle:{color:WHITE,fontSize:15,fontWeight:'800'},settingHint:{color:MUTED,fontSize:11,marginTop:4},
 dhikrCard:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:15,marginTop:12},dhikrTop:{alignItems:'center',justifyContent:'space-between',gap:8},dhikrTitle:{color:GOLD,fontSize:16,fontWeight:'900',flex:1},count:{color:MUTED,fontSize:11},dhikrText:{color:WHITE,fontSize:18,lineHeight:34,textAlign:'right',writingDirection:'rtl',marginTop:12},
 doneButton:{backgroundColor:GOLD,borderRadius:15,paddingVertical:15,alignItems:'center',marginTop:18},doneText:{color:NAVY,fontSize:15,fontWeight:'900'}
});
