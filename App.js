import React,{useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,Switch,Alert,Platform,ImageBackground} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createAudioPlayer} from 'expo-audio';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import cities from './src/data/cities.seed.json';
import nationalEvents from './src/data/national-events.json';
import religiousEvents from './src/data/events.json';
import adhanRegistry from './src/data/adhan-registry.json';
import {calculatePrayerTimes,calculateFastingTimes} from './src/engine/prayer';
import {jdFromDate,illumination,elongationDeg,findConjunctionNear} from './src/engine/astronomy';
import {proposedLunisolarDate,addLunisolarMonths,addLunisolarYears,lunisolarMonthLength} from './src/engine/lunisolar';

Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldShowBanner:true,
    shouldShowList:true,
    shouldPlaySound:true,
    shouldSetBadge:false
  })
});

const fmtPct=x=>`${Math.round(x*100)}%`;
const APP_VARIANT=process.env.EXPO_PUBLIC_APP_VARIANT==='paid'?'paid':'trial';
const ADHAN_ASSETS={
 'commons-beautiful-adhan':require('./assets/adhan/beautiful_adhan.ogg'),
 'commons-syria-sabah-fakhry':require('./assets/adhan/adhan_syria_sabah_fakhry.ogg'),
 'commons-morocco-hassan-ii':require('./assets/adhan/adhan_morocco_hassan_ii.ogg'),
 'commons-kazakhstan-shalqar':require('./assets/adhan/adhan_kazakhstan_shalqar.ogg'),
 'commons-aaqib-azeez':require('./assets/adhan/adhan_aaqib_azeez.ogg')
};
const ADHAN_NOTIFICATION_SOUNDS={
 'commons-beautiful-adhan':'beautiful_adhan.ogg',
 'commons-syria-sabah-fakhry':'adhan_syria_sabah_fakhry.ogg',
 'commons-morocco-hassan-ii':'adhan_morocco_hassan_ii.ogg',
 'commons-kazakhstan-shalqar':'adhan_kazakhstan_shalqar.ogg',
 'commons-aaqib-azeez':'adhan_aaqib_azeez.ogg'
};
const PRAYERS=[['الفجر','fajr','♜'],['الشروق','sunrise','☼'],['الظهر','dhuhr','☀'],['العصر','asr','☀'],['المغرب','maghrib','◒'],['العشاء','isha','☾']];
const WEEKDAYS=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const RAMADAN_VERSE='وَكُلُوا وَاشْرَبُوا حَتَّىٰ يَتَبَيَّنَ لَكُمُ الْخَيْطُ الْأَبْيَضُ مِنَ الْخَيْطِ الْأَسْوَدِ مِنَ الْفَجْرِ ۖ ثُمَّ أَتِمُّوا الصِّيَامَ إِلَى اللَّيْلِ';
const PRAYER_METHODS=[['MWL','رابطة العالم الإسلامي'],['EGYPT','الهيئة المصرية'],['KARACHI','جامعة كراتشي'],['UMM_AL_QURA','أم القرى']];
const PRIVACY_SUMMARY='يستخدم الأفق موقعك أثناء تشغيل التطبيق فقط لحساب المواقيت واختيار المدينة الأقرب. تُحفظ تفضيلات الأذان محليًا على جهازك. لا توجد حسابات مستخدمين، ولا إعلانات، ولا نبيع بيانات شخصية. يمكنك سحب أذونات الموقع والإشعارات أو حذف البيانات من إعدادات جهازك في أي وقت.';
const COPYRIGHT_SUMMARY='© 2026 وسام محمد — جميع الحقوق محفوظة. يُمنح المستخدم حقًا شخصيًا لاستخدام النسخة التي حصل عليها بصورة مشروعة. يُحظر نسخ التطبيق أو إعادة بيعه أو نشره أو تعديله أو استخراج تصميمه وأصوله دون إذن كتابي. شراء النسخة المدفوعة لا ينقل ملكية التطبيق. تبقى المكتبات والأصوات الخارجية خاضعة لتراخيص أصحابها.';

function formatArabicClock(d){return new Intl.DateTimeFormat('ar-IQ',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(d)}
function formatGregorian(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
function weekday(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long'}).format(d)}
function gregorianMonthTitle(d){return new Intl.DateTimeFormat('ar-IQ',{month:'long',year:'numeric'}).format(d)}
function shiftGregorianMonth(date,amount){const d=new Date(date);d.setDate(1);d.setMonth(d.getMonth()+amount);return d}
function civilDateForTimeZone(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return new Date(Date.UTC(Number(values.year),Number(values.month)-1,Number(values.day),12));
 }catch(e){return new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),12))}
}
function civilDayKey(date,timeZone){
 try{return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
 catch(e){return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`}
}
function timeZoneOffsetMinutes(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const represented=Date.UTC(Number(values.year),Number(values.month)-1,Number(values.day),Number(values.hour),Number(values.minute),Number(values.second));
  return Math.round((represented-date.getTime())/60000);
 }catch(e){return -date.getTimezoneOffset()}
}
function utcDateFromMinutes(date,minutes){
 if(minutes==null)return null;
 const result=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),0,0,0));
 result.setUTCMinutes(minutes);
 return result;
}
function distanceKm(a,b){const R=6371,rad=x=>x*Math.PI/180;const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
const religiousFor=(m,d)=>religiousEvents.filter(e=>((e.m===m&&e.d===d)||(e.m===m&&e.range&&d>=e.range[0]&&d<=e.range[1])||(e.dates||[]).some(x=>x.m===m&&x.d===d))).filter((e,i,all)=>all.findIndex(x=>x.ar===e.ar)===i);
const nationalFor=(country,date)=>(nationalEvents[country]||[]).filter(e=>e.month===date.getMonth()+1&&e.day===date.getDate());
const lunarEventsForDay=lunar=>religiousFor(lunar.month,lunar.day).map(e=>({type:'مناسبة دينية',name:e.ar,details:e.note_ar||''}));
const gregorianEventsForDay=(country,date)=>nationalFor(country,date).map(e=>({type:'مناسبة وطنية',name:e.name_ar,details:e.note_ar||''}));

const LUNAR_ACCENTS=['#f5b94c','#65c7d0','#d6a8ff','#ffb36b','#73d6a1','#83b9ff','#ffc857','#e8a0bf','#f2c14e','#79c9c5','#9ab7ff','#d0a4ff'];
const PAID_THEMES={
 night:{name:'ليلي',background:'#06121f',sky:'#152b4c',accent:'#f4bb52',symbol:'☾'},
 sunrise:{name:'شروق',background:'#24182a',sky:'#d06e4d',accent:'#ffd06a',symbol:'◒'},
 autumn:{name:'خريفي',background:'#21150f',sky:'#8c472d',accent:'#e9a94c',symbol:'🍂'},
 winter:{name:'شتوي',background:'#14202a',sky:'#7894a6',accent:'#e9f5ff',symbol:'❄'}
};
const THEME_CHOICES=[['night','ليلي'],['sunrise','شروق'],['autumn','خريفي'],['winter','شتوي']];

export default function App(){
 const [tab,setTab]=useState('today');
 const [coords,setCoords]=useState({lat:33.3152,lon:44.3661});
 const [city,setCity]=useState(cities.find(x=>x.id==='iq-baghdad'));
 const [locState,setLocState]=useState('بغداد • افتراضي');
 const [adhanEnabled,setAdhanEnabled]=useState(false);
 const [now,setNow]=useState(new Date());
 const [locationBusy,setLocationBusy]=useState(false);
 const [method,setMethod]=useState('MWL');
 const [calendarDate,setCalendarDate]=useState(new Date());
 const [gregorianDate,setGregorianDate]=useState(new Date());
 const [selectedAdhan,setSelectedAdhan]=useState(null);
 const [showAdhanVoices,setShowAdhanVoices]=useState(false);
 const [showAdhanLicense,setShowAdhanLicense]=useState(false);
const [selectedCalendarEvent,setSelectedCalendarEvent]=useState(null);
 const [selectedEventTitle,setSelectedEventTitle]=useState('');
 const [selectedEventCalendar,setSelectedEventCalendar]=useState(null);
 const [swipeStartX,setSwipeStartX]=useState(null);
 const [adhanSound,setAdhanSound]=useState(null);
 const adhanPlayerRef=useRef(null);
 const [imsakAlertEnabled,setImsakAlertEnabled]=useState(false);
 const [iftarAlertEnabled,setIftarAlertEnabled]=useState(false);
 const [showPrivacy,setShowPrivacy]=useState(false);
 const [showCopyright,setShowCopyright]=useState(false);
 const [showCityChoices,setShowCityChoices]=useState(false);
 const [selectedTheme,setSelectedTheme]=useState('night');
 const [adhanVolume,setAdhanVolume]=useState(.7);
 const dayKey=civilDayKey(now,city?.tz);

 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>()=>{
  try{adhanPlayerRef.current?.pause();adhanPlayerRef.current?.release()}catch(e){}
  adhanPlayerRef.current=null;
 },[]);

 useEffect(()=>{
  let active=true;
  async function restoreLocationAndMethod(){
   try{
    const [cityId,savedMethod]=await Promise.all([
     AsyncStorage.getItem('alofq_city_id'),
     AsyncStorage.getItem('alofq_prayer_method')
    ]);
    if(!active)return;
    const savedCity=cities.find(x=>x.id===cityId);
    if(savedCity){
     setCity(savedCity);
     setCoords({lat:savedCity.lat,lon:savedCity.lon});
     setLocState(`${savedCity.name_ar} • محفوظ`);
    }
    if(PRAYER_METHODS.some(([id])=>id===savedMethod))setMethod(savedMethod);
   }catch(e){console.log('Saved settings restore error:',e)}
  }
  restoreLocationAndMethod();
  return()=>{active=false};
 },[]);

 useEffect(()=>{
  AsyncStorage.getItem('alofq_paid_theme').then(id=>{
   if(PAID_THEMES[id])setSelectedTheme(id);
  }).catch(e=>console.log('Theme restore error:',e));
 },[]);

 useEffect(()=>{
  AsyncStorage.getItem('alofq_adhan_volume').then(value=>{
   const parsed=Number(value);
   if(Number.isFinite(parsed)&&parsed>=0&&parsed<=1)setAdhanVolume(parsed);
  }).catch(e=>console.log('Volume restore error:',e));
 },[]);


 useEffect(()=>{
  let active=true;
  async function restoreNotificationSettings(){
   try{
    const [prayer,imsak,iftar]=await Promise.all([
     AsyncStorage.getItem('alofq_prayer_alerts'),
     AsyncStorage.getItem('alofq_imsak_alerts'),
     AsyncStorage.getItem('alofq_iftar_alerts')
    ]);
    if(active){setAdhanEnabled(prayer==='1');setImsakAlertEnabled(imsak==='1');setIftarAlertEnabled(iftar==='1')}
   }catch(e){console.log('Notification settings restore error:',e)}
  }
  restoreNotificationSettings();
  return()=>{active=false};
 },[]);

 async function setNotificationPreference(kind,value){
  try{
   if(value){
    const current=await Notifications.getPermissionsAsync();
    const result=current.status==='granted'?current:await Notifications.requestPermissionsAsync();
    if(result.status!=='granted'){
     Alert.alert('الإشعارات غير مسموحة','يمكنك منح إذن الإشعارات من إعدادات الهاتف.');
     return;
    }
   }
   const setters={prayer:setAdhanEnabled,imsak:setImsakAlertEnabled,iftar:setIftarAlertEnabled};
   setters[kind](value);
   await AsyncStorage.setItem(`alofq_${kind}_alerts`,value?'1':'0');
  }catch(e){
   Alert.alert('تعذر حفظ الإعداد','حاول مرة أخرى.');
  }
 }

 async function useGps(showMessage=true){
   try{
     setLocationBusy(true);
     const p=await Location.requestForegroundPermissionsAsync();

     if(p.status!=='granted'){
       setLocState('الموقع غير مسموح');
       if(showMessage) Alert.alert('الموقع','فعّل إذن الموقع للتطبيق من إعدادات Android.');
       return;
     }

     const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
     const c={lat:pos.coords.latitude,lon:pos.coords.longitude};
     setCoords(c);

     let nearest=cities[0],best=99999;
     for(const x of cities){
       const d=distanceKm(c,x);
       if(d<best){
         best=d;
         nearest=x;
       }
     }

     let label='موقعي الحالي';
     try{
       const r=await Location.reverseGeocodeAsync(c);
       const g=r?.[0];
       label=g?.district||g?.subregion||g?.city||g?.name||'موقعي الحالي';
     }catch(e){
       label='موقعي الحالي';
     }

     setCity(nearest);
     setLocState(label);
     try{await AsyncStorage.setItem('alofq_city_id',nearest.id)}catch(e){console.log('GPS city save error:',e)}
   }catch(e){
     setLocState('تعذر قراءة GPS');
     if(showMessage) Alert.alert('تعذر تحديد الموقع','تأكد من تشغيل GPS ومنح الإذن للتطبيق.');
   }finally{
     setLocationBusy(false);
   }
 }

 async function chooseCity(id){
   const c=cities.find(x=>x.id===id);
   if(!c)return;
   setCity(c);
   setCoords({lat:c.lat,lon:c.lon});
   setLocState(`${c.name_ar} • اختيار يدوي`);
   try{await AsyncStorage.setItem('alofq_city_id',c.id)}catch(e){console.log('City save error:',e)}
 }

 const tzOffsetMin=timeZoneOffsetMinutes(now,city?.tz);
 const prayerCalcDate=useMemo(()=>civilDateForTimeZone(now,city?.tz),[dayKey,city?.tz]);

 const prayerData=useMemo(()=>calculatePrayerTimes({
   date:prayerCalcDate,
   lat:coords.lat,
   lon:coords.lon,
   tzOffsetMin,
   method,
   asrFactor:1
 }),[coords.lat,coords.lon,prayerCalcDate,method,tzOffsetMin]);
 const prayers=prayerData.formatted;

 const fastingData=useMemo(()=>calculateFastingTimes({
   date:prayerCalcDate,
   lat:coords.lat,
   lon:coords.lon,
   tzOffsetMin
 }),[coords.lat,coords.lon,prayerCalcDate,tzOffsetMin]);

 const fasting=fastingData.formatted;

 const lunar=useMemo(()=>proposedLunisolarDate(now),[now.toDateString()]);
 const isRamadan=lunar.month===9;
 const calendarView=useMemo(()=>proposedLunisolarDate(calendarDate),[calendarDate]);

 const calendarDays=Array.from(
   {length:lunisolarMonthLength(calendarDate)},
   (_,i)=>i+1
 );

 const calendarMonthStart=useMemo(()=>{
   const d=new Date(calendarDate);
   d.setUTCDate(d.getUTCDate()-(calendarView.day-1));
   return d;
 },[calendarDate,calendarView.day]);

 const calendarStartWeekday=calendarMonthStart.getUTCDay();

 const gregorianDays=useMemo(()=>{
   const year=gregorianDate.getFullYear();
   const month=gregorianDate.getMonth();
   return Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>i+1);
 },[gregorianDate]);
 const gregorianStartWeekday=new Date(gregorianDate.getFullYear(),gregorianDate.getMonth(),1).getDay();

 const jd=jdFromDate(now);
 const illum=illumination(jd);
 const elong=elongationDeg(jd);
 const conj=findConjunctionNear(now);
 const selectedPaidTheme=PAID_THEMES[selectedTheme]||PAID_THEMES.night;
 const theme={...selectedPaidTheme,label:`الثيم ${selectedPaidTheme.name}`};

 useEffect(()=>{
   let active=true;

   async function chooseInitialAdhan(){
     try{
       const manual=await AsyncStorage.getItem('alofq_adhan_manual');
       const savedId=await AsyncStorage.getItem('alofq_selected_adhan_id');

       if(manual==='1'&&savedId){
         const saved=adhanRegistry.find(p=>p.id===savedId&&p.status==='licensed'&&ADHAN_ASSETS[p.id]&&p.available_in?.includes(APP_VARIANT));
         if(saved&&active){
           setSelectedAdhan(saved);
           return;
         }
       }

       const licensed=adhanRegistry.filter(p=>p.status==='licensed'&&ADHAN_ASSETS[p.id]&&p.available_in?.includes(APP_VARIANT));
       if(!licensed.length)return;

       const country=(city?.country||'').toUpperCase();
       let preferred=licensed.find(
         p=>String(p.country||'').toUpperCase()===country
       );

       if(!preferred){
         preferred=licensed.find(p=>p.country==='*')||licensed[0];
       }

       if(preferred&&active){
         setSelectedAdhan(preferred);
       }
     }catch(e){
       console.log('Initial adhan selection error:',e);
     }
   }

   chooseInitialAdhan();
   return()=>{active=false};
 },[city?.country]);

 useEffect(()=>{
  let active=true;
  async function setupPrayerNotifications(){
   try{
    const soundFile=ADHAN_NOTIFICATION_SOUNDS[selectedAdhan?.id]||'beautiful_adhan.ogg';
    // Android notification-channel sounds are immutable after creation, so each
    // bundled adhan gets its own stable channel. The OS can then play it while
    // the app is backgrounded, closed, or the screen is locked.
    const channelId=`prayers-adhan-${String(selectedAdhan?.id||'default').replace(/[^a-z0-9-]/gi,'-')}`;
    if(Platform.OS==='android'){
     await Notifications.setNotificationChannelAsync(channelId,{
      name:`الأذان — ${selectedAdhan?.display_ar||'الصوت المختار'}`,
      description:'تشغيل صوت الأذان تلقائيًا عند دخول وقت الصلاة',
      importance:Notifications.AndroidImportance.MAX,
      vibrationPattern:[0,250,200,250],
      sound:soundFile,
      audioAttributes:{
       contentType:Notifications.AndroidAudioContentType.SONIFICATION,
       usage:Notifications.AndroidAudioUsage.NOTIFICATION
      }
     });
    }
    const scheduled=await Notifications.getAllScheduledNotificationsAsync();
    for(const item of scheduled){
     if(item.content?.data?.kind==='alofq-prayer')await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
    if(!adhanEnabled||!selectedAdhan||!active)return;
    const permission=await Notifications.getPermissionsAsync();
    if(permission.status!=='granted')return;
    const prayerNames={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
    for(const [key,title] of Object.entries(prayerNames)){
     const date=utcDateFromMinutes(prayerCalcDate,prayerData.rawMinutesUtc[key]);
     if(!date||date.getTime()<=Date.now())continue;
     await Notifications.scheduleNotificationAsync({
      content:{
       title:`حان وقت صلاة ${title}`,
       body:`يُرفع الآن الأذان بصوت ${selectedAdhan.display_ar}.`,
       sound:soundFile,
       priority:Notifications.AndroidNotificationPriority.MAX,
       data:{kind:'alofq-prayer',prayer:key,adhanId:selectedAdhan.id}
      },
      trigger:{
       type:Notifications.SchedulableTriggerInputTypes.DATE,
       date,
       channelId:Platform.OS==='android'?channelId:undefined
      }
     });
    }
   }catch(e){console.log('Prayer notifications error:',e)}
  }
  setupPrayerNotifications();
  return()=>{active=false};
 },[adhanEnabled,dayKey,prayerData,prayerCalcDate,selectedAdhan?.id]);

 useEffect(()=>{
   let active=true;

   async function setupFastingNotifications(){
     try{
       if(Platform.OS==='android'){
         await Notifications.setNotificationChannelAsync('fasting',{
           name:'تنبيهات الإمساك والإفطار',
           importance:Notifications.AndroidImportance.HIGH,
           vibrationPattern:[0,300,250,300]
         });
       }

       const scheduled=await Notifications.getAllScheduledNotificationsAsync();

       for(const n of scheduled){
         if(
           n.content?.data?.kind==='alofq-imsak'||
           n.content?.data?.kind==='alofq-iftar'
         ){
           await Notifications.cancelScheduledNotificationAsync(n.identifier);
         }
       }

       const current=await Notifications.getPermissionsAsync();
       if(current.status!=='granted'||!active)return;

       if(!isRamadan)return;

       const imsakDate=utcDateFromMinutes(prayerCalcDate,fastingData.rawMinutesUtc.imsak);
       const iftarDate=utcDateFromMinutes(prayerCalcDate,fastingData.rawMinutesUtc.iftar);

       if(imsakAlertEnabled&&imsakDate&&imsakDate>Date.now()){
         await Notifications.scheduleNotificationAsync({
           content:{
             title:'موعد الإمساك',
             body:'حان الآن موعد الإمساك بحسب المعيار الفلكي المعتمد في الأفق.',
             sound:'default',
             data:{kind:'alofq-imsak'}
           },
           trigger:{
             type:Notifications.SchedulableTriggerInputTypes.DATE,
             date:imsakDate,
             channelId:'fasting'
           }
         });
       }

       if(iftarAlertEnabled&&iftarDate&&iftarDate>Date.now()){
         await Notifications.scheduleNotificationAsync({
           content:{
             title:'موعد الإفطار',
             body:RAMADAN_VERSE+' — سورة البقرة، الآية 187',
             sound:'default',
             data:{kind:'alofq-iftar'}
           },
           trigger:{
             type:Notifications.SchedulableTriggerInputTypes.DATE,
             date:iftarDate,
             channelId:'fasting'
           }
         });
       }
     }catch(e){
       console.log('Fasting notifications error:',e);
     }
   }

   setupFastingNotifications();
   return()=>{active=false};
 },[
   fastingData.rawMinutesUtc.imsak,
   fastingData.rawMinutesUtc.iftar,
   imsakAlertEnabled,
   iftarAlertEnabled,
   isRamadan,
   dayKey,
   prayerCalcDate
 ]);

 const packs=adhanRegistry.filter(p=>p.status==='licensed'&&p.asset&&ADHAN_ASSETS[p.id]&&p.available_in?.includes(APP_VARIANT));
 async function previewAdhan(pack){
  try{
   stopAdhan();
   const asset=ADHAN_ASSETS[pack.id];
   if(!asset){Alert.alert("الصوت غير متوفر","ملف هذا الأذان غير موجود داخل التطبيق.");return}
   const sound=createAudioPlayer(asset);
   sound.volume=adhanVolume;
   adhanPlayerRef.current=sound;
   setAdhanSound(sound);
   sound.play();
  }catch(e){Alert.alert("خطأ","تعذر تشغيل صوت الأذان.")}
 }

 async function changeAdhanVolume(value){
  const next=Math.max(0,Math.min(1,value));
  setAdhanVolume(next);
  if(adhanPlayerRef.current)adhanPlayerRef.current.volume=next;
  try{await AsyncStorage.setItem('alofq_adhan_volume',String(next))}catch(e){console.log('Volume save error:',e)}
 }
 function stopAdhan(){
  const player=adhanPlayerRef.current;
  adhanPlayerRef.current=null;
  try{player?.pause();player?.seekTo?.(0);player?.release()}catch(e){console.log('Adhan stop error:',e)}
  setAdhanSound(null);
 }

 function changeTab(nextTab){
  stopAdhan();
  setShowAdhanVoices(false);
  setTab(nextTab);
 }


 return <ImageBackground source={require('./assets/mecca-night-background.png')} resizeMode='cover' style={s.background}>
  <View pointerEvents='none' style={[s.backgroundShade,{backgroundColor:theme.background}]}/>
  <SafeAreaView style={s.root}>
  <View pointerEvents='none' style={[s.themeSky,{backgroundColor:theme.sky}]}><Text style={[s.themeSymbol,{color:theme.accent}]}>{theme.symbol}</Text><View style={[s.themeOrb,{borderColor:theme.accent}]}/></View>
 <ScrollView contentContainerStyle={s.page}>
   {tab==='today'&&<View style={s.hero}>
    <View style={s.heroTopRow}>
     <Pressable style={s.headerIconButton} onPress={()=>changeTab('settings')}><Text style={s.headerIcon}>⚙</Text></Pressable>
     <View style={s.brandBlock}>
      <Text style={[s.appName,{color:theme.accent}]}>التقويم الإسلامي</Text>
      <Text style={s.appSub}>مواقيت الصلاة والتقويم الهجري والميلادي</Text>
     </View>
     <Text style={s.menuIcon}>☰</Text>
    </View>
    <Pressable style={s.locationPill} onPress={()=>useGps(true)}>
      <Text style={s.locationPin}>📍</Text>
      <View><Text numberOfLines={1} style={s.locationText}>{locationBusy?'جاري تحديد الموقع...':locState}</Text><Text style={s.locationCaption}>الموقع الحالي</Text></View>
    </Pressable>
   </View>}
   {tab==='today'&&<>
    <View style={s.clockCard}>
  <Text style={s.week}>{weekday(now)}</Text>
  <Text style={s.hdate}>{lunar.day} {lunar.monthNameAr} {lunar.year} هـ</Text>
  <Text style={s.gdate}>{formatGregorian(now)}</Text>
  {isRamadan&&<View style={s.ramadanMini}>
    <Text style={s.ramadanMiniTitle}>رَمَضَانُ مُبَارَك</Text>
    <Text style={s.ramadanMiniText}>تقبل الله منا ومنكم صالح الأعمال</Text>
  </View>}
</View>
    
    {isRamadan&&<Card title='رمضان — الإمساك والإفطار'><View style={s.pg}><View style={s.pi}><Text style={s.muted}>الإمساك</Text><Text style={s.gold}>{fasting.imsak}</Text></View><View style={s.pi}><Text style={s.muted}>الإفطار</Text><Text style={s.gold}>{fasting.iftar}</Text></View></View><View style={s.row}><Text style={s.text}>تنبيه موعد الإمساك</Text><Switch value={imsakAlertEnabled} onValueChange={v=>setNotificationPreference('imsak',v)}/></View><View style={s.row}><Text style={s.text}>تنبيه موعد الإفطار</Text><Switch value={iftarAlertEnabled} onValueChange={v=>setNotificationPreference('iftar',v)}/></View><Text style={s.sub}>سيُحسب موعد الإمساك وموعد الإفطار بشكل مستقل عن أذان الفجر والمغرب.</Text><Text style={[s.text,{marginTop:12,lineHeight:28}]}>{RAMADAN_VERSE}</Text><Text style={s.sub}>سورة البقرة — الآية 187</Text></Card>}
<Card title='مواقيت الصلاة'>
  <Text style={s.prayerHint}>مواقيت اليوم حسب موقعك الحالي</Text>
  <PrayerGrid p={prayers} onPress={()=>changeTab('adhan')}/>
  <Pressable style={s.prayerLink} onPress={()=>changeTab('adhan')}>
    <Text style={s.prayerLinkText}>عرض التفاصيل واختيار الأذان ←</Text>
  </Pressable>
</Card>
   </>}
   {tab==='calendar'&&<>
    <Card title='التقويم القمري–الشمسي'>
     <Text style={s.researchNotice}>نسخة بحثية تقديرية وليست تقويمًا شرعيًا أو رسميًا معتمدًا.</Text>
     <View onStartShouldSetResponder={()=>true} onResponderGrant={e=>setSwipeStartX(e.nativeEvent.pageX)} onResponderRelease={e=>{if(swipeStartX===null)return;const dx=e.nativeEvent.pageX-swipeStartX;if(dx>50)setCalendarDate(d=>addLunisolarMonths(d,-1));if(dx<-50)setCalendarDate(d=>addLunisolarMonths(d,1));setSwipeStartX(null)}}>
      <Text style={s.calendarTitle}>{calendarView.monthNameAr} {calendarView.year} هـ</Text>
      <View style={s.calendarControls}>
       <Pressable style={s.calendarButton} onPress={()=>setCalendarDate(d=>addLunisolarMonths(d,-1))}><Text style={s.calendarButtonText}>الشهر السابق</Text></Pressable>
       <Pressable style={s.todayButton} onPress={()=>setCalendarDate(new Date())}><Text style={s.todayButtonText}>اليوم</Text></Pressable>
       <Pressable style={s.calendarButton} onPress={()=>setCalendarDate(d=>addLunisolarMonths(d,1))}><Text style={s.calendarButtonText}>الشهر القادم</Text></Pressable>
      </View>
      <View style={s.weekRow}>{WEEKDAYS.map(w=><Text key={w} style={s.weekDay}>{w}</Text>)}</View>
      <View style={s.dayGrid}>
       {Array.from({length:calendarStartWeekday},(_,i)=><View key={`lunar-blank-${i}`} style={s.dayCellBlank}/>)}
       {calendarDays.map(day=>{const date=new Date(calendarDate);date.setUTCDate(date.getUTCDate()+(day-calendarView.day));const ld=proposedLunisolarDate(date);const ev=lunarEventsForDay(ld);const isToday=ld.year===lunar.year&&ld.month===lunar.month&&ld.day===lunar.day;return <Pressable key={day} style={[s.dayCell,ev.length>0&&s.eventCell,isToday&&s.todayCell]} onPress={()=>{setCalendarDate(date);setSelectedEventCalendar('lunar');setSelectedEventTitle(`${day} ${ld.monthNameAr} ${ld.year} هـ`);setSelectedCalendarEvent(ev)}}><Text style={[s.dayText,ev.length>0&&s.eventDayText,isToday&&s.todayDayText]}>{day}</Text>{ev.length>0&&<View style={s.eventDot}/>}</Pressable>})}
      </View>
      {selectedEventCalendar==='lunar'&&selectedCalendarEvent&&<EventDetails title={selectedEventTitle} events={selectedCalendarEvent}/>}
     </View>
    </Card>
    <Card title='التقويم الميلادي'>
     <Text style={s.calendarTitle}>{gregorianMonthTitle(gregorianDate)}</Text>
     <View style={s.calendarControls}>
      <Pressable style={s.calendarButton} onPress={()=>{setGregorianDate(d=>shiftGregorianMonth(d,-1));setSelectedCalendarEvent(null)}}><Text style={s.calendarButtonText}>الشهر السابق</Text></Pressable>
      <Pressable style={s.todayButton} onPress={()=>{setGregorianDate(new Date());setSelectedCalendarEvent(null)}}><Text style={s.todayButtonText}>اليوم</Text></Pressable>
      <Pressable style={s.calendarButton} onPress={()=>{setGregorianDate(d=>shiftGregorianMonth(d,1));setSelectedCalendarEvent(null)}}><Text style={s.calendarButtonText}>الشهر القادم</Text></Pressable>
     </View>
     <View style={s.weekRow}>{WEEKDAYS.map(w=><Text key={w} style={s.weekDay}>{w}</Text>)}</View>
     <View style={s.dayGrid}>
      {Array.from({length:gregorianStartWeekday},(_,i)=><View key={`gregorian-blank-${i}`} style={s.dayCellBlank}/>)}
      {gregorianDays.map(day=>{const date=new Date(gregorianDate.getFullYear(),gregorianDate.getMonth(),day);const ev=gregorianEventsForDay(city.country,date);const isToday=date.toDateString()===now.toDateString();return <Pressable key={day} style={[s.dayCell,ev.length>0&&s.eventCell,isToday&&s.todayCell]} onPress={()=>{setSelectedEventCalendar('gregorian');setSelectedEventTitle(new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:'long',year:'numeric'}).format(date));setSelectedCalendarEvent(ev)}}><Text style={[s.dayText,ev.length>0&&s.eventDayText,isToday&&s.todayDayText]}>{day}</Text>{ev.length>0&&<View style={s.eventDot}/>}</Pressable>})}
     </View>
     {selectedEventCalendar==='gregorian'&&selectedCalendarEvent&&<EventDetails title={selectedEventTitle} events={selectedCalendarEvent}/>}
    </Card>
   </>}
   {tab==='adhan'&&<>
    <Pressable style={s.backButton} onPress={()=>changeTab('today')}><Text style={s.backButtonText}>‹ الرجوع إلى الرئيسية</Text></Pressable>
    <Card title='مواقيت الصلاة'><PrayerGrid p={prayers}/></Card>
    <Card title='إعداد الأذان'><View style={s.row}><Text style={s.text}>تشغيل تنبيهات الصلاة</Text><Switch value={adhanEnabled} onValueChange={v=>setNotificationPreference('prayer',v)}/></View><Text style={s.sub}>يُطلب إذن الإشعارات فقط عند التفعيل. يعمل صوت الأذان المختار تلقائيًا عند دخول وقت الصلاة، حتى عندما يكون التطبيق في الخلفية.</Text><Pressable style={s.primary} onPress={()=>{if(showAdhanVoices){stopAdhan();setShowAdhanVoices(false)}else setShowAdhanVoices(true)}}><Text style={s.primaryText}>{showAdhanVoices?'إغلاق قائمة الأصوات ✕':'🔊 اختيار ومعاينة صوت الأذان'}</Text></Pressable>{showAdhanVoices&&packs.map(p=><Pressable key={p.id} style={s.adhanChoice} onPress={async()=>{setSelectedAdhan(p);await AsyncStorage.setItem('alofq_selected_adhan_id',p.id);await AsyncStorage.setItem('alofq_adhan_manual','1');setShowAdhanLicense(false);previewAdhan(p)}}><Text style={s.playIcon}>▶</Text><Text style={s.text}>{p.display_ar}</Text></Pressable>)}{showAdhanVoices&&<Pressable disabled={!adhanSound} style={[s.stopButton,!adhanSound&&s.stopButtonDisabled]} onPress={stopAdhan}><Text style={s.stopButtonText}>■ إيقاف الصوت فورًا</Text></Pressable>}{selectedAdhan&&<><View style={s.row}><Text style={s.text}>{selectedAdhan.display_ar}</Text><Pressable style={s.choice} onPress={()=>setShowAdhanLicense(showAdhanLicense===false)}><Text style={s.choiceText}>الترخيص</Text></Pressable></View>{showAdhanLicense&&<Text style={selectedAdhan.status==='licensed'?s.ok:s.warn}>{selectedAdhan.status==='licensed'?'✓ الترخيص: '+(selectedAdhan.license||'غير محدد')+' • المصدر: '+(selectedAdhan.source||'غير محدد'):(selectedAdhan.note_ar||'هذا التسجيل يحتاج إلى إثبات تصريح قبل إضافته للتطبيق.')}</Text>}</>}</Card>
   </>}
{tab==='settings'&&<>
    <Card title='إعدادات التنبيهات'>
     <View style={s.settingRow}><Text style={s.settingIcon}>🔔</Text><View style={s.settingText}><Text style={s.text}>تنبيه الإمساك</Text><Text style={s.sub}>{fasting.imsak}</Text></View><Switch value={imsakAlertEnabled} onValueChange={v=>setNotificationPreference('imsak',v)} trackColor={{true:'#c89232'}}/></View>
     <View style={s.settingRow}><Text style={s.settingIcon}>🔔</Text><View style={s.settingText}><Text style={s.text}>تنبيه الإفطار</Text><Text style={s.sub}>{fasting.iftar}</Text></View><Switch value={iftarAlertEnabled} onValueChange={v=>setNotificationPreference('iftar',v)} trackColor={{true:'#c89232'}}/></View>
     <View style={s.settingRow}><Text style={s.settingIcon}>🔔</Text><View style={s.settingText}><Text style={s.text}>تنبيهات الصلوات</Text></View><Switch value={adhanEnabled} onValueChange={v=>setNotificationPreference('prayer',v)} trackColor={{true:'#c89232'}}/></View>
     <Pressable style={s.soundSelector} onPress={()=>{if(showAdhanVoices)stopAdhan();setShowAdhanVoices(v=>!v)}}><Text style={s.settingIcon}>🔊</Text><View style={s.settingText}><Text style={s.text}>صوت التنبيه والأذان</Text><Text numberOfLines={1} style={s.sub}>{selectedAdhan?.display_ar||'اختر صوت الأذان'}</Text></View><Text style={s.chevron}>‹</Text></Pressable>
     {showAdhanVoices&&packs.map(p=><Pressable key={p.id} style={[s.adhanChoice,selectedAdhan?.id===p.id&&s.selectedSound]} onPress={async()=>{setSelectedAdhan(p);await AsyncStorage.setItem('alofq_selected_adhan_id',p.id);await AsyncStorage.setItem('alofq_adhan_manual','1');previewAdhan(p)}}><Text style={s.playIcon}>▶</Text><Text style={s.text}>{p.display_ar}</Text></Pressable>)}
     {showAdhanVoices&&<Pressable disabled={!adhanSound} style={[s.stopButton,!adhanSound&&s.stopButtonDisabled]} onPress={stopAdhan}><Text style={s.stopButtonText}>■ إيقاف المعاينة</Text></Pressable>}
     <View style={s.volumeBox}><Text style={s.text}>مستوى الصوت — {Math.round(adhanVolume*100)}٪</Text><View style={s.volumeTrack}>{[.2,.4,.6,.8,1].map(level=><Pressable key={level} onPress={()=>changeAdhanVolume(level)} style={[s.volumeStep,adhanVolume>=level&&s.volumeStepOn]}/>)}</View></View>
    </Card>
    <Card title='الثيمات'>
     <Text style={s.sub}>اختر شكل التطبيق، وسيُحفظ اختيارك تلقائيًا.</Text>
     <View style={s.themeChoices}>{THEME_CHOICES.map(([id,label])=>{const item=PAID_THEMES[id];return <Pressable key={id} style={[s.themeChoice,{backgroundColor:item.sky,borderColor:item.accent},selectedTheme===id&&s.themeChoiceOn]} onPress={async()=>{setSelectedTheme(id);try{await AsyncStorage.setItem('alofq_paid_theme',id)}catch(e){console.log('Theme save error:',e)}}}><Text style={s.themeChoiceSymbol}>{item.symbol}</Text><Text style={s.themeChoiceText}>{label}</Text></Pressable>})}</View>
    </Card>
    <Card title='اختيار المدينة يدويًا'><Pressable style={s.secondaryButton} onPress={()=>setShowCityChoices(v=>!v)}><Text style={s.secondaryButtonText}>{showCityChoices?'إغلاق قائمة المدن':'عرض المدن'}</Text></Pressable>{showCityChoices&&cities.map(item=><Pressable key={item.id} style={[s.cityChoice,item.id===city?.id&&s.cityChoiceActive]} onPress={()=>{chooseCity(item.id);setShowCityChoices(false)}}><Text style={item.id===city?.id?s.cityChoiceTextActive:s.cityChoiceText}>{item.name_ar}</Text></Pressable>)}</Card>
    <Card title='طريقة حساب مواقيت الصلاة'><View style={s.wrap}>{PRAYER_METHODS.map(([id,label])=><Pressable key={id} style={[s.choice,method===id&&s.choiceOn]} onPress={async()=>{setMethod(id);try{await AsyncStorage.setItem('alofq_prayer_method',id)}catch(e){console.log('Method save error:',e)}}}><Text style={method===id?s.choiceOnText:s.choiceText}>{label}</Text></Pressable>)}</View><Text style={s.sub}>قد تختلف المواقيت عن الجهة الدينية الرسمية في بلدك؛ راجع الجهة المحلية عند الحاجة.</Text></Card>
    <Card title='سياسة الخصوصية'>
     <Text style={s.text}>الموقع لحساب المواقيت فقط، والتفضيلات محفوظة على جهازك.</Text>
     <Pressable style={s.secondaryButton} onPress={()=>setShowPrivacy(v=>!v)}><Text style={s.secondaryButtonText}>{showPrivacy?'إخفاء السياسة':'قراءة سياسة الخصوصية'}</Text></Pressable>
     {showPrivacy&&<><Text style={s.policyText}>{PRIVACY_SUMMARY}</Text><Text style={s.policyMeta}>سارية على النسختين • آخر تحديث: 5 سبتمبر 2026</Text></>}
    </Card>
    <Card title='حقوق الطبع والنشر والتوزيع'>
     <Text style={s.text}>© 2026 الأفق — تصميم وفكرة وتطوير: وسام محمد</Text>
     <Pressable style={s.secondaryButton} onPress={()=>setShowCopyright(v=>!v)}><Text style={s.secondaryButtonText}>{showCopyright?'إخفاء السياسة':'قراءة سياسة الطبع والتوزيع'}</Text></Pressable>
     {showCopyright&&<><Text style={s.policyText}>{COPYRIGHT_SUMMARY}</Text><Text style={s.policyMeta}>المكونات الخارجية تبقى خاضعة لتراخيص أصحابها.</Text></>}
    </Card>
   </>}
  </ScrollView>
  <View style={s.nav}>{[
    ['today','⌂','الرئيسية'],
    ['calendar','▦','التقويم'],
    ['adhan','◔','الصلاة'],
    ['settings','⚙','الإعدادات']
  ].map(([id,icon,t])=><Pressable key={id} onPress={()=>changeTab(id)} style={s.navb}>
    <Text style={tab===id?s.navIconActive:s.navIcon}>{icon}</Text>
    <Text style={tab===id?s.active:s.muted}>{t}</Text>
  </Pressable>)}</View>
  </SafeAreaView>
 </ImageBackground>
}
function Card({title,children}){return <View style={s.card}><Text style={s.title}>{title}</Text>{children}</View>}
function PrayerGrid({p,onPress}){return <View style={s.pg}>{PRAYERS.map(([a,k,icon])=><Pressable onPress={onPress} style={[s.prayerRow,k==='maghrib'&&s.prayerRowAccent]} key={k}><Text style={[s.prayerTime,k==='maghrib'&&s.prayerTimeAccent]}>{p[k]}</Text><Text style={s.prayerName}>{a}</Text><Text style={[s.prayerIcon,k==='maghrib'&&s.prayerIconAccent]}>{icon}</Text></Pressable>)}</View>}
function EventDetails({title,events}){return <View style={s.eventList}><Text style={s.eventTitle}>{title}</Text>{events.length?events.map((e,i)=><View key={`${e.type}-${e.name}-${i}`} style={s.eventItem}><Text style={s.eventName}>● {e.name}</Text><Text style={s.eventType}>{e.type}</Text>{Boolean(e.details)&&<Text style={s.sub}>{e.details}</Text>}</View>):<Text style={s.noEvent}>لا توجد مناسبة مسجلة في هذا اليوم.</Text>}</View>}
const s=StyleSheet.create({
 background:{flex:1,backgroundColor:'#020b12'},backgroundShade:{...StyleSheet.absoluteFillObject,opacity:.76},root:{flex:1,backgroundColor:'transparent'},themeSky:{position:'absolute',top:0,left:0,right:0,height:360,opacity:.18,overflow:'hidden'},themeSymbol:{position:'absolute',top:78,right:34,fontSize:72,fontWeight:'900'},themeOrb:{position:'absolute',width:230,height:230,borderRadius:115,borderWidth:1,top:120,left:-100,opacity:.2},themeLabel:{fontSize:12,fontWeight:'800',textAlign:'center',marginBottom:10},page:{paddingHorizontal:13,paddingTop:5,paddingBottom:98},hero:{paddingTop:8,paddingBottom:12},heroTopRow:{minHeight:82,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between'},brandBlock:{flex:1,alignItems:'center'},headerIconButton:{width:42,height:42,alignItems:'center',justifyContent:'center'},headerIcon:{color:'#fff',fontSize:25},menuIcon:{color:'#fff',fontSize:27,width:42,textAlign:'center'},appName:{fontSize:29,fontWeight:'900',textAlign:'center',marginTop:4},appSub:{color:'#e0c384',fontSize:12,fontWeight:'700',textAlign:'center',marginTop:5},locationPill:{alignSelf:'center',minWidth:'57%',minHeight:54,paddingVertical:8,paddingHorizontal:18,borderRadius:28,borderWidth:1,borderColor:'#d39c3f',backgroundColor:'rgba(3,14,22,.86)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},locationPin:{fontSize:21},locationText:{color:'#fff',fontSize:14,fontWeight:'800',textAlign:'center',maxWidth:180},locationCaption:{color:'#9ea9ae',fontSize:10,textAlign:'center',marginTop:2},
 clockCard:{alignItems:'center',paddingVertical:17,paddingHorizontal:13,marginTop:6,borderRadius:22,borderWidth:1,borderColor:'#53606a',backgroundColor:'rgba(1,11,18,.9)'},clock:{color:'#efb64f',fontSize:27,fontWeight:'900',marginTop:8},week:{color:'#fff',fontSize:21,fontWeight:'900',marginBottom:9},hdate:{textAlign:'center',fontSize:18,fontWeight:'800',color:'#fff'},gdate:{textAlign:'center',fontSize:14,fontWeight:'700',color:'#d9e0e3',marginTop:6},ramadanMini:{marginTop:14,width:'100%',backgroundColor:'rgba(4,15,22,.82)',borderRadius:15,paddingVertical:12,paddingHorizontal:14,alignItems:'center',borderWidth:1,borderColor:'#8c713f'},ramadanMiniTitle:{color:'#efc570',fontSize:21,fontWeight:'900'},ramadanMiniText:{color:'#ddd5c4',fontSize:12,fontWeight:'700',marginTop:4,textAlign:'center'},
 moon:{width:150,height:150,borderRadius:75,backgroundColor:'#e6c578',alignSelf:'center',marginTop:20,overflow:'hidden'},shadow:{position:'absolute',right:0,top:0,bottom:0,backgroundColor:'#0c2638',borderTopLeftRadius:75,borderBottomLeftRadius:75},phase:{color:'#fff',textAlign:'center',marginTop:12,fontWeight:'700'},sub:{color:'#a5b0b6',marginTop:7,textAlign:'right',lineHeight:21},subCenter:{color:'#9ba8ae',marginTop:8,textAlign:'center'},
 card:{backgroundColor:'rgba(1,12,19,.91)',borderRadius:20,padding:14,marginTop:12,borderWidth:1,borderColor:'#46535b',shadowColor:'#000',shadowOpacity:.4,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:6},title:{color:'#fff',fontSize:20,fontWeight:'900',textAlign:'right',marginBottom:12},text:{color:'#f3f4f4',textAlign:'right',lineHeight:24},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:11,borderBottomWidth:1,borderBottomColor:'#26343d'},settingRow:{minHeight:70,flexDirection:'row-reverse',alignItems:'center',gap:12,padding:11,marginBottom:7,borderRadius:15,backgroundColor:'rgba(2,16,24,.92)',borderWidth:1,borderColor:'#273741'},settingIcon:{fontSize:22},settingText:{flex:1},soundSelector:{minHeight:76,flexDirection:'row-reverse',alignItems:'center',gap:12,padding:12,borderRadius:15,backgroundColor:'rgba(2,16,24,.92)',borderWidth:1,borderColor:'#273741'},chevron:{color:'#efb64f',fontSize:36},volumeBox:{padding:14,marginTop:9,borderRadius:15,backgroundColor:'rgba(2,16,24,.92)'},volumeTrack:{flexDirection:'row',gap:6,marginTop:15},volumeStep:{flex:1,height:7,borderRadius:4,backgroundColor:'#46525a'},volumeStepOn:{backgroundColor:'#efaa37'},selectedSound:{backgroundColor:'rgba(221,157,48,.18)'},adhanChoice:{minHeight:58,flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',paddingVertical:12,paddingHorizontal:8,borderBottomWidth:1,borderBottomColor:'#26343d'},playIcon:{color:'#efb64f',fontSize:20},stopButton:{backgroundColor:'#542424',borderWidth:1,borderColor:'#c95f5f',padding:13,borderRadius:12,marginTop:10},stopButtonDisabled:{opacity:.4},stopButtonText:{color:'#fff',fontWeight:'900',textAlign:'center'},warn:{color:'#ffcb6b'},ok:{color:'#87d8a4'},
 pg:{borderTopWidth:1,borderTopColor:'#25333b'},pi:{flex:1,minWidth:'45%',padding:12,borderRadius:13,alignItems:'center',backgroundColor:'rgba(2,16,24,.9)',borderWidth:1,borderColor:'#26343d'},prayerRow:{minHeight:49,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#25333b',paddingHorizontal:10},prayerRowAccent:{marginVertical:3,borderWidth:1,borderColor:'#9b712d',borderRadius:13,backgroundColor:'rgba(140,95,25,.22)'},prayerTime:{width:82,color:'#fff',fontSize:18,fontWeight:'700',textAlign:'left'},prayerTimeAccent:{color:'#f4bd5b',fontWeight:'900'},prayerName:{flex:1,color:'#f4f5f5',fontSize:15,textAlign:'right'},prayerIcon:{width:35,color:'#f1e6cd',fontSize:23,textAlign:'center'},prayerIconAccent:{color:'#f4bd5b'},gold:{color:'#f4bb52',fontWeight:'900',fontSize:17,marginTop:4},muted:{color:'#9eabb2'},active:{color:'#f4b94f',fontWeight:'900'},primary:{backgroundColor:'#efb44d',padding:14,borderRadius:18,marginTop:12},primaryText:{color:'#10151a',fontWeight:'900',textAlign:'center'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'flex-end'},choice:{paddingVertical:9,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'#4b5a63'},choiceOn:{backgroundColor:'#e9aa3d',borderColor:'#e9aa3d'},choiceText:{color:'#eef0f1'},choiceOnText:{color:'#10151a',fontWeight:'900'},
 prayerHint:{color:'#a5b0b6',fontSize:12,fontWeight:'700',textAlign:'right',marginBottom:8},calendarTitle:{color:'#fff',fontSize:21,fontWeight:'900',textAlign:'center',marginBottom:13},researchNotice:{color:'#d9b86e',fontSize:11,textAlign:'center',lineHeight:18,marginBottom:11},calendarControls:{flexDirection:'row-reverse',alignItems:'stretch',gap:7},calendarButton:{flex:1,minHeight:48,borderWidth:1,borderColor:'#4c5961',borderRadius:13,alignItems:'center',justifyContent:'center',paddingHorizontal:5},calendarButtonText:{color:'#f1b84f',fontSize:12,fontWeight:'800',textAlign:'center'},todayButton:{minWidth:72,minHeight:48,backgroundColor:'#efb54d',borderRadius:13,alignItems:'center',justifyContent:'center'},todayButtonText:{color:'#111820',fontWeight:'900'},weekRow:{flexDirection:'row-reverse',marginTop:15,marginBottom:3},weekDay:{width:'14.285%',color:'#d9dee0',fontSize:10,fontWeight:'800',textAlign:'center'},dayGrid:{flexDirection:'row-reverse',flexWrap:'wrap',marginTop:4,borderWidth:1,borderColor:'#24343e',borderRadius:12,overflow:'hidden'},dayCell:{width:'14.285%',height:47,alignItems:'center',justifyContent:'center',borderWidth:.4,borderColor:'#22323b'},dayCellBlank:{width:'14.285%',height:47,borderWidth:.4,borderColor:'#22323b'},eventCell:{backgroundColor:'rgba(200,146,50,.13)'},todayCell:{backgroundColor:'#efb54d',borderRadius:23},dayText:{color:'#eef1f2',fontWeight:'700'},eventDayText:{color:'#f4bb52',fontWeight:'900'},todayDayText:{color:'#101820',fontWeight:'900'},eventDot:{width:5,height:5,borderRadius:3,backgroundColor:'#f4bb52',marginTop:3},eventList:{marginTop:12,padding:12,borderWidth:1,borderColor:'#80632f',borderRadius:14,backgroundColor:'#06131b'},eventTitle:{color:'#f4bb52',fontWeight:'900',fontSize:16,textAlign:'right',marginBottom:8},eventItem:{paddingVertical:7,borderTopWidth:1,borderTopColor:'#26343d'},eventName:{color:'#f4bb52',fontWeight:'900',fontSize:15,textAlign:'right'},eventType:{color:'#a1adb3',fontSize:12,textAlign:'right',marginTop:3},noEvent:{color:'#9daab0',textAlign:'right'},themeChoices:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9,marginTop:13},themeChoice:{width:'47%',minHeight:108,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center'},themeChoiceOn:{borderWidth:3},themeChoiceSymbol:{fontSize:36},themeChoiceText:{color:'#fff',fontWeight:'900',marginTop:7},secondaryButton:{borderWidth:1,borderColor:'#b78131',padding:13,borderRadius:16,marginTop:10},secondaryButtonText:{color:'#f2b84d',fontWeight:'900',textAlign:'center'},cityChoice:{paddingVertical:11,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:'#26343d'},cityChoiceActive:{backgroundColor:'rgba(200,146,50,.16)'},cityChoiceText:{color:'#e0e5e7',textAlign:'right'},cityChoiceTextActive:{color:'#f4bb52',textAlign:'right',fontWeight:'900'},policyText:{color:'#dbe2e5',textAlign:'right',lineHeight:25,marginTop:14},policyMeta:{color:'#96a5ac',textAlign:'right',lineHeight:21,marginTop:8,fontSize:12},backButton:{alignSelf:'flex-start',borderWidth:0,paddingVertical:10,paddingHorizontal:5,marginTop:5},backButtonText:{color:'#fff',fontSize:17,fontWeight:'900'},dayCellOn:{backgroundColor:'#eaae43',borderColor:'#eaae43'},dayTextOn:{color:'#101820',fontWeight:'900'},nav:{position:'absolute',bottom:0,left:0,right:0,height:75,backgroundColor:'rgba(2,13,20,.98)',borderTopWidth:1,borderTopColor:'#33424a',flexDirection:'row-reverse',paddingTop:5},navb:{flex:1,alignItems:'center',justifyContent:'center',gap:2},navIcon:{color:'#89969c',fontSize:20,fontWeight:'700'},navIconActive:{color:'#f4b94f',fontSize:22,fontWeight:'900'},prayerLink:{marginTop:8,paddingVertical:11,alignItems:'center',borderTopWidth:1,borderTopColor:'#25333b'},prayerLinkText:{color:'#f4bb52',fontSize:13,fontWeight:'800'}
});
