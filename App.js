import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,Switch,Alert,Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createAudioPlayer} from 'expo-audio';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {Magnetometer} from 'expo-sensors';
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
 'commons-aishatu98-adhan':require('./assets/adhan/adhan-aishatu98.ogg'),
 'commons-beautiful-adhan':require('./assets/adhan/beautiful-adhan.ogg'),
 'commons-andrewler-azan':require('./assets/adhan/azan-andrewler.ogg'),
 'commons-mecca-2013':require('./assets/adhan/mecca-adhan-2013.ogg')
};
const PRAYERS=[['الفجر','fajr'],['الشروق','sunrise'],['الظهر','dhuhr'],['العصر','asr'],['المغرب','maghrib'],['العشاء','isha']];
const WEEKDAYS=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const RAMADAN_VERSE='وَكُلُوا وَاشْرَبُوا حَتَّىٰ يَتَبَيَّنَ لَكُمُ الْخَيْطُ الْأَبْيَضُ مِنَ الْخَيْطِ الْأَسْوَدِ مِنَ الْفَجْرِ ۖ ثُمَّ أَتِمُّوا الصِّيَامَ إِلَى اللَّيْلِ';
const PRAYER_METHODS=[['MWL','رابطة العالم الإسلامي'],['EGYPT','الهيئة المصرية'],['KARACHI','جامعة كراتشي'],['UMM_AL_QURA','أم القرى']];
const PRIVACY_SUMMARY='يستخدم الأفق موقعك أثناء تشغيل التطبيق فقط لحساب المواقيت والقبلة واختيار المدينة الأقرب. تُحفظ تفضيلات الأذان محليًا على جهازك. لا توجد حسابات مستخدمين، ولا إعلانات، ولا نبيع بيانات شخصية. يمكنك سحب أذونات الموقع والإشعارات أو حذف البيانات من إعدادات جهازك في أي وقت.';
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
const nationalFor=(country,date)=>(nationalEvents[country]||[]).filter(e=>e.month===date.getUTCMonth()+1&&e.day===date.getUTCDate());
const eventsForDay=(country,date,lunar)=>[...religiousFor(lunar.month,lunar.day).map(e=>({type:'دينية',name:e.ar})),...nationalFor(country,date).map(e=>({type:'وطنية',name:e.name_ar}))];

const LUNAR_ACCENTS=['#f5b94c','#65c7d0','#d6a8ff','#ffb36b','#73d6a1','#83b9ff','#ffc857','#e8a0bf','#f2c14e','#79c9c5','#9ab7ff','#d0a4ff'];
function paidTheme(date,lunarMonth,isRamadan){
 const hour=date.getHours();
 const month=date.getMonth();
 const season=month>=2&&month<=4?'الربيع':month>=5&&month<=7?'الصيف':month>=8&&month<=10?'الخريف':'الشتاء';
 const period=hour>=5&&hour<10?{name:'الصباح',bg:'#71431f',sky:'#d9863d',symbol:'☀'}:hour>=10&&hour<17?{name:'النهار',bg:'#075b82',sky:'#27a4c8',symbol:'☀'}:hour>=17&&hour<20?{name:'المساء',bg:'#742f35',sky:'#d66a3c',symbol:'◒'}:{name:'الليل',bg:'#120f32',sky:'#302060',symbol:'☾'};
 if(isRamadan)return {background:'#17233f',sky:'#49376f',accent:'#f5c96a',label:'رمضان • '+period.name+' • '+season,symbol:'☾'};
 return {background:period.bg,sky:period.sky,accent:LUNAR_ACCENTS[(lunarMonth-1)%12],label:period.name+' • '+season+' • الشهر القمري '+lunarMonth,symbol:period.symbol};
}

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
 const [swipeStartX,setSwipeStartX]=useState(null);
 const [adhanSound,setAdhanSound]=useState(null);
 const [imsakAlertEnabled,setImsakAlertEnabled]=useState(false);
 const [iftarAlertEnabled,setIftarAlertEnabled]=useState(false);
 const [showPrivacy,setShowPrivacy]=useState(false);
 const [showCopyright,setShowCopyright]=useState(false);
 const [compassHeading,setCompassHeading]=useState(null);
 const [compassAvailable,setCompassAvailable]=useState(true);
 const [showCityChoices,setShowCityChoices]=useState(false);
 const dayKey=civilDayKey(now,city?.tz);

 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>()=>{adhanSound?.release()},[adhanSound]);

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

 useEffect(()=>{
   let subscription;
   let active=true;
   async function startCompass(){
     try{
       const available=await Magnetometer.isAvailableAsync();
       if(!active)return;
       setCompassAvailable(available);
       if(!available)return;
       Magnetometer.setUpdateInterval(250);
       subscription=Magnetometer.addListener(({x,y})=>{
         let heading=Math.atan2(y,x)*180/Math.PI;
         heading=(heading+360)%360;
         setCompassHeading(heading);
       });
     }catch(e){
       if(active)setCompassAvailable(false);
     }
   }
   if(tab==='qibla')startCompass();
   return()=>{active=false;subscription?.remove()};
 },[tab]);

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

 const qiblaBearing=useMemo(()=>{
   const lat1=coords.lat*Math.PI/180;
   const lon1=coords.lon*Math.PI/180;
   const lat2=21.4225*Math.PI/180;
   const lon2=39.8262*Math.PI/180;

   const y=Math.sin(lon2-lon1)*Math.cos(lat2);
   const x=Math.cos(lat1)*Math.sin(lat2)
     -Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);

   return (Math.atan2(y,x)*180/Math.PI+360)%360;
 },[coords.lat,coords.lon]);
 const qiblaDelta=compassHeading===null?0:((qiblaBearing-compassHeading+540)%360)-180;
 const isFacingQibla=compassHeading!==null&&Math.abs(qiblaDelta)<=5;

 const jd=jdFromDate(now);
 const illum=illumination(jd);
 const elong=elongationDeg(jd);
 const conj=findConjunctionNear(now);
 const theme=APP_VARIANT==='paid'?paidTheme(now,lunar.month,isRamadan):{background:'#061724',sky:'#0b2232',accent:'#f4bb52',label:'الثيم الداكن الثابت',symbol:'☾'};

 useEffect(()=>{
   let active=true;

   async function chooseInitialAdhan(){
     try{
       const manual=await AsyncStorage.getItem('alofq_adhan_manual');
       const savedId=await AsyncStorage.getItem('alofq_selected_adhan_id');

       if(manual==='1'&&savedId){
         const saved=adhanRegistry.find(p=>p.id===savedId&&p.status==='licensed'&&ADHAN_ASSETS[p.id]);
         if(saved&&active){
           setSelectedAdhan(saved);
           return;
         }
       }

       const licensed=adhanRegistry.filter(p=>p.status==='licensed'&&ADHAN_ASSETS[p.id]);
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
    if(Platform.OS==='android'){
     await Notifications.setNotificationChannelAsync('prayers',{name:'تنبيهات الصلاة',importance:Notifications.AndroidImportance.HIGH,vibrationPattern:[0,250,200,250],sound:'default'});
    }
    const scheduled=await Notifications.getAllScheduledNotificationsAsync();
    for(const item of scheduled){
     if(item.content?.data?.kind==='alofq-prayer')await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
    if(!adhanEnabled||!active)return;
    const permission=await Notifications.getPermissionsAsync();
    if(permission.status!=='granted')return;
    const prayerNames={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
    for(const [key,title] of Object.entries(prayerNames)){
     const date=utcDateFromMinutes(prayerCalcDate,prayerData.rawMinutesUtc[key]);
     if(!date||date.getTime()<=Date.now())continue;
     await Notifications.scheduleNotificationAsync({
      content:{title:`حان وقت صلاة ${title}`,body:'افتح تطبيق الأفق لمشاهدة التفاصيل والاستماع إلى صوت الأذان المختار.',sound:'default',data:{kind:'alofq-prayer',prayer:key}},
      trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date,channelId:'prayers'}
     });
    }
   }catch(e){console.log('Prayer notifications error:',e)}
  }
  setupPrayerNotifications();
  return()=>{active=false};
 },[adhanEnabled,dayKey,prayerData,prayerCalcDate]);

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

 const packs=adhanRegistry.filter(p=>p.status==='licensed'&&p.asset&&ADHAN_ASSETS[p.id]);
 async function previewAdhan(pack){
  try{
   if(adhanSound){adhanSound.release();setAdhanSound(null)}
   const asset=ADHAN_ASSETS[pack.id];
   if(!asset){Alert.alert("الصوت غير متوفر","ملف هذا الأذان غير موجود داخل التطبيق.");return}
   const sound=createAudioPlayer(asset);
   sound.play();
   setAdhanSound(sound);
  }catch(e){Alert.alert("خطأ","تعذر تشغيل صوت الأذان.")}
 }


 return <SafeAreaView style={[s.root,{backgroundColor:theme.background}]}>
  {APP_VARIANT==='paid'&&<View pointerEvents='none' style={[s.themeSky,{backgroundColor:theme.sky}]}><Text style={[s.themeSymbol,{color:theme.accent}]}>{theme.symbol}</Text><View style={[s.themeOrb,{borderColor:theme.accent}]}/></View>}
  <ScrollView contentContainerStyle={s.page}>
   <View style={s.hero}>
    <Text style={[s.appName,{color:theme.accent}]}>الأفق</Text>
    <Text style={s.appSub}>{APP_VARIANT==='paid'?'النسخة المدفوعة • التقويم العربي والمواقيت':'النسخة التجريبية • التقويم العربي والمواقيت'}</Text>
    <Text style={[s.themeLabel,{color:theme.accent}]}>{theme.label}</Text>
    <Pressable style={s.locationPill} onPress={()=>useGps(true)}>
      <Text style={s.locationPin}>📍</Text>
      <Text style={s.locationText}>{locationBusy?'جاري تحديد الموقع...':locState}</Text>
    </Pressable>
   </View>
   {tab==='today'&&<>
    <View style={s.clockCard}>
  <Text style={s.week}>{weekday(now)}</Text>
  <Text style={s.hdate}>{lunar.day} {lunar.monthNameAr} {lunar.year} هـ</Text>
  <Text style={s.gdate}>{formatGregorian(now)}</Text>
  <Text style={s.clock}>{formatArabicClock(now)}</Text>
  {isRamadan&&<View style={s.ramadanMini}>
    <Text style={s.ramadanMiniTitle}>رَمَضَانُ مُبَارَك</Text>
    <Text style={s.ramadanMiniText}>تقبل الله منا ومنكم صالح الأعمال</Text>
  </View>}
</View>
    
    <Card title='القمر اليوم'>
      <View style={s.moon}><View style={[s.shadow,{width:Math.max(8,140*(1-illum))}]}/></View>
      <Text style={s.phase}>إضاءة القمر {fmtPct(illum)}</Text>
      <Text style={s.subCenter}>الاستطالة {elong.toFixed(1)}°</Text>
      <Text style={s.subCenter}>أقرب اقتران محسوب: {conj.toLocaleString('ar-IQ')}</Text>
    </Card>
    {isRamadan&&<Card title='رمضان — الإمساك والإفطار'><View style={s.pg}><View style={s.pi}><Text style={s.muted}>الإمساك</Text><Text style={s.gold}>{fasting.imsak}</Text></View><View style={s.pi}><Text style={s.muted}>الإفطار</Text><Text style={s.gold}>{fasting.iftar}</Text></View></View><View style={s.row}><Text style={s.text}>تنبيه موعد الإمساك</Text><Switch value={imsakAlertEnabled} onValueChange={v=>setNotificationPreference('imsak',v)}/></View><View style={s.row}><Text style={s.text}>تنبيه موعد الإفطار</Text><Switch value={iftarAlertEnabled} onValueChange={v=>setNotificationPreference('iftar',v)}/></View><Text style={s.sub}>سيُحسب موعد الإمساك وموعد الإفطار بشكل مستقل عن أذان الفجر والمغرب.</Text><Text style={[s.text,{marginTop:12,lineHeight:28}]}>{RAMADAN_VERSE}</Text><Text style={s.sub}>سورة البقرة — الآية 187</Text></Card>}
<Card title='مواقيت الصلاة'>
  <Text style={s.prayerHint}>مواقيت اليوم حسب موقعك الحالي</Text>
  <PrayerGrid p={prayers} onPress={()=>setTab('adhan')}/>
  <Pressable style={s.prayerLink} onPress={()=>setTab('adhan')}>
    <Text style={s.prayerLinkText}>عرض التفاصيل واختيار الأذان ←</Text>
  </Pressable>
</Card>
    <Card title='الموقع'><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?'جاري تحديد الموقع...':'📍 تحديث موقعي'}</Text></Pressable><Text style={s.textCenter}>{locState}</Text></Card>
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
       {calendarDays.map(day=>{const date=new Date(calendarDate);date.setUTCDate(date.getUTCDate()+(day-calendarView.day));const ld=proposedLunisolarDate(date);const ev=eventsForDay(city.country,date,ld);const isToday=ld.year===lunar.year&&ld.month===lunar.month&&ld.day===lunar.day;return <Pressable key={day} style={[s.dayCell,ev.length>0&&s.eventCell,isToday&&s.todayCell]} onPress={()=>{setCalendarDate(date);setSelectedCalendarEvent(ev)}}><Text style={[s.dayText,ev.length>0&&s.eventDayText,isToday&&s.todayDayText]}>{day}</Text>{ev.length>0&&<View style={s.eventDot}/>}</Pressable>})}
      </View>
      {selectedCalendarEvent&&selectedCalendarEvent.length>0&&<View style={s.eventList}>{selectedCalendarEvent.map((e,i)=><Text key={i} style={s.text}>• {e.type} — {e.name}</Text>)}</View>}
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
      {gregorianDays.map(day=>{const date=new Date(gregorianDate.getFullYear(),gregorianDate.getMonth(),day);const ld=proposedLunisolarDate(date);const ev=eventsForDay(city.country,date,ld);const isToday=date.toDateString()===now.toDateString();return <Pressable key={day} style={[s.dayCell,ev.length>0&&s.eventCell,isToday&&s.todayCell]} onPress={()=>setSelectedCalendarEvent(ev)}><Text style={[s.dayText,ev.length>0&&s.eventDayText,isToday&&s.todayDayText]}>{day}</Text>{ev.length>0&&<View style={s.eventDot}/>}</Pressable>})}
     </View>
     {selectedCalendarEvent&&selectedCalendarEvent.length>0&&<View style={s.eventList}>{selectedCalendarEvent.map((e,i)=><Text key={`${e.type}-${e.name}-${i}`} style={s.text}>• {e.type} — {e.name}</Text>)}</View>}
    </Card>
    <Card title='خيارات التقويم'>
     <Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?'جاري تحديد الموقع...':'📍 تحديث الموقع'}</Text></Pressable>
     <Pressable style={s.secondaryButton} onPress={()=>setTab('adhan')}><Text style={s.secondaryButtonText}>🔊 اختيار صوت الأذان</Text></Pressable>
    </Card>
   </>}
   {tab==='adhan'&&<>
    <Pressable style={s.backButton} onPress={()=>setTab('calendar')}><Text style={s.backButtonText}>← الرجوع إلى التقويم</Text></Pressable>
    <Card title='مواقيت الصلاة'><PrayerGrid p={prayers}/></Card>
    <Card title='إعداد الأذان'><View style={s.row}><Text style={s.text}>تشغيل تنبيهات الصلاة</Text><Switch value={adhanEnabled} onValueChange={v=>setNotificationPreference('prayer',v)}/></View><Text style={s.sub}>يُطلب إذن الإشعارات فقط عند تفعيل التنبيهات. يستخدم الإشعار المجدول صوت النظام، ويمكن الاستماع إلى الأذان المختار من داخل التطبيق.</Text><Pressable style={s.primary} onPress={()=>setShowAdhanVoices(showAdhanVoices===false)}><Text style={s.primaryText}>🔊 اختيار ومعاينة صوت الأذان</Text></Pressable>{showAdhanVoices&&packs.map(p=><Pressable key={p.id} style={s.row} onPress={async()=>{setSelectedAdhan(p);await AsyncStorage.setItem('alofq_selected_adhan_id',p.id);await AsyncStorage.setItem('alofq_adhan_manual','1');setShowAdhanVoices(false);setShowAdhanLicense(false);previewAdhan(p)}}><Text style={s.text}>{p.display_ar}</Text></Pressable>)}{selectedAdhan&&<><View style={s.row}><Text style={s.text}>{selectedAdhan.display_ar}</Text><Pressable style={s.choice} onPress={()=>setShowAdhanLicense(showAdhanLicense===false)}><Text style={s.choiceText}>الترخيص</Text></Pressable></View>{showAdhanLicense&&<Text style={selectedAdhan.status==='licensed'?s.ok:s.warn}>{selectedAdhan.status==='licensed'?'✓ الترخيص: '+(selectedAdhan.license||'غير محدد')+' • المصدر: '+(selectedAdhan.source||'غير محدد'):(selectedAdhan.note_ar||'هذا التسجيل يحتاج إلى إثبات تصريح قبل إضافته للتطبيق.')}</Text>}</>}</Card>
   </>}
   {tab==='qibla'&&<><Card title='بوصلة القبلة'>
    <Text style={s.textCenter}>ضع الهاتف بشكل أفقي وحرّكه على شكل رقم 8 للمعايرة.</Text>
    <View style={[s.compass,isFacingQibla&&s.compassAligned]}>
     <Text style={s.compassNorth}>ش</Text>
     <View style={[s.qiblaNeedle,{transform:[{rotate:`${qiblaDelta}deg`}]}]}><Text style={s.qiblaArrow}>▲</Text><Text style={s.kaaba}>🕋</Text></View>
     <View style={s.compassCenter}/>
    </View>
    {!compassAvailable?<Text style={s.warn}>مستشعر البوصلة غير متاح في هذا الهاتف.</Text>:compassHeading===null?<Text style={s.subCenter}>جاري تشغيل مستشعر البوصلة…</Text>:<>
     <Text style={[s.qiblaStatus,isFacingQibla&&s.qiblaStatusAligned]}>{isFacingQibla?'✓ أنت باتجاه القبلة':'دوّر الهاتف باتجاه السهم'}</Text>
     <Text style={s.subCenter}>اتجاه الهاتف: {compassHeading.toFixed(0)}° • القبلة: {qiblaBearing.toFixed(1)}°</Text>
    </>}
    <Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?'جاري تحديث الموقع...':'📍 تحديث موقعي'}</Text></Pressable><Text style={s.coords}>{locState}</Text>
   </Card></>}
{tab==='settings'&&<>
    <Card title='تحديد الموقع'><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>📍 تحديد موقعي تلقائيًا GPS</Text></Pressable><Text style={s.sub}>{locState}</Text><Pressable style={s.secondaryButton} onPress={()=>setShowCityChoices(v=>!v)}><Text style={s.secondaryButtonText}>{showCityChoices?'إخفاء المدن':'اختيار المدينة يدويًا'}</Text></Pressable>{showCityChoices&&cities.map(item=><Pressable key={item.id} style={[s.cityChoice,item.id===city?.id&&s.cityChoiceActive]} onPress={()=>{chooseCity(item.id);setShowCityChoices(false)}}><Text style={item.id===city?.id?s.cityChoiceTextActive:s.cityChoiceText}>{item.name_ar}</Text></Pressable>)}</Card>
    <Card title='طريقة حساب مواقيت الصلاة'><View style={s.wrap}>{PRAYER_METHODS.map(([id,label])=><Pressable key={id} style={[s.choice,method===id&&s.choiceOn]} onPress={async()=>{setMethod(id);try{await AsyncStorage.setItem('alofq_prayer_method',id)}catch(e){console.log('Method save error:',e)}}}><Text style={method===id?s.choiceOnText:s.choiceText}>{label}</Text></Pressable>)}</View><Text style={s.sub}>قد تختلف المواقيت عن الجهة الدينية الرسمية في بلدك؛ راجع الجهة المحلية عند الحاجة.</Text></Card>
    <Card title='سياسة الخصوصية'>
     <Text style={s.text}>الموقع للمواقيت والقبلة فقط، والتفضيلات محفوظة على جهازك.</Text>
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
    ['qibla','⌖','القبلة'],
    ['settings','⚙','الإعدادات']
  ].map(([id,icon,t])=><Pressable key={id} onPress={()=>setTab(id)} style={s.navb}>
    <Text style={tab===id?s.navIconActive:s.navIcon}>{icon}</Text>
    <Text style={tab===id?s.active:s.muted}>{t}</Text>
  </Pressable>)}</View>
 </SafeAreaView>
}
function Card({title,children}){return <View style={s.card}><Text style={s.title}>{title}</Text>{children}</View>}
function PrayerGrid({p,onPress}){return <View style={s.pg}>{PRAYERS.map(([a,k])=><Pressable onPress={onPress} style={s.pi} key={k}><Text style={s.muted}>{a}</Text><Text style={s.gold}>{p[k]}</Text></Pressable>)}</View>}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#061724'},themeSky:{position:'absolute',top:0,left:0,right:0,height:300,opacity:.72,overflow:'hidden'},themeSymbol:{position:'absolute',top:42,right:34,fontSize:82,fontWeight:'900'},themeOrb:{position:'absolute',width:240,height:240,borderRadius:120,borderWidth:2,top:115,left:-90,opacity:.28},themeLabel:{fontSize:12,fontWeight:'800',textAlign:'center',marginBottom:10},page:{padding:16,paddingBottom:104},top:{gap:6},badge:{color:'#f4bb52',fontWeight:'800',textAlign:'right'},hero:{alignItems:'center',paddingTop:12,paddingBottom:8},appName:{color:'#f4bb52',fontSize:38,fontWeight:'900',textAlign:'center',marginTop:4},appSub:{color:'#d5dde2',fontSize:15,fontWeight:'700',textAlign:'center',marginTop:4,marginBottom:14},locationPill:{minWidth:'72%',maxWidth:'92%',minHeight:48,paddingVertical:11,paddingHorizontal:16,borderRadius:24,borderWidth:1,borderColor:'#c89232',backgroundColor:'#0b2232',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},locationPin:{fontSize:18},locationText:{color:'#eef4f7',fontSize:15,fontWeight:'700',textAlign:'center',flexShrink:1},loc:{color:'#b5c7d1',textAlign:'right',fontSize:12,flexShrink:1,maxWidth:'72%'},clockCard:{alignItems:'center',paddingVertical:18,paddingHorizontal:14,marginTop:14,borderRadius:22,borderWidth:1,borderColor:'#8f6827',backgroundColor:'rgba(5,17,26,0.92)'},clock:{color:'#f4bb52',fontSize:28,fontWeight:'900',marginTop:8},week:{color:'#ffffff',fontSize:20,fontWeight:'900',marginBottom:8},hdate:{textAlign:'center',fontSize:27,fontWeight:'900',color:'#fff'},gdate:{textAlign:'center',fontSize:20,fontWeight:'800',color:'#fff'},textCenter:{color:'#eef4f7',textAlign:'center',marginTop:8},prayerHint:{color:'#9fb7c5',fontSize:13,fontWeight:'700',textAlign:'right',marginBottom:10},ramadanMini:{marginTop:14,width:'100%',backgroundColor:'#b9872f',borderRadius:16,paddingVertical:12,paddingHorizontal:14,alignItems:'center'},ramadanMiniTitle:{color:'#fff',fontSize:18,fontWeight:'900'},ramadanMiniText:{color:'#fff',fontSize:13,fontWeight:'700',marginTop:4,textAlign:'center'},
 moon:{width:150,height:150,borderRadius:75,backgroundColor:'#e6c578',alignSelf:'center',marginTop:20,overflow:'hidden'},shadow:{position:'absolute',right:0,top:0,bottom:0,backgroundColor:'#0c2638',borderTopLeftRadius:75,borderBottomLeftRadius:75},phase:{color:'#fff',textAlign:'center',marginTop:12,fontWeight:'700'},sub:{color:'#91a9b7',marginTop:8,textAlign:'right',lineHeight:21},subCenter:{color:'#91a9b7',marginTop:8,textAlign:'center'},
 card:{backgroundColor:'#091d2a',borderRadius:22,padding:17,marginTop:14,borderWidth:1,borderColor:'#8f6827',shadowColor:'#000',shadowOpacity:0.22,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:4},title:{color:'#f4bb52',fontSize:19,fontWeight:'900',textAlign:'right',marginBottom:12},text:{color:'#eef4f7',textAlign:'right',lineHeight:24},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#1e4055'},warn:{color:'#ffcb6b'},ok:{color:'#87d8a4'},
 pg:{flexDirection:'row',flexWrap:'wrap',gap:8},pi:{width:'31%',backgroundColor:'#091f2f',padding:12,borderRadius:12,alignItems:'center',borderWidth:1,borderColor:'#21465e'},gold:{color:'#f4bb52',fontWeight:'900',fontSize:17,marginTop:4},muted:{color:'#99b0bd'},active:{color:'#f4bb52',fontWeight:'900'},primary:{backgroundColor:'#c89232',padding:13,borderRadius:12,marginTop:12},primaryText:{color:'#071724',fontWeight:'900',textAlign:'center'},coords:{color:'#93aab7',textAlign:'center',marginTop:10,fontSize:12},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'flex-end'},choice:{paddingVertical:9,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'#31536a'},choiceOn:{backgroundColor:'#c89232',borderColor:'#c89232'},choiceText:{color:'#e8f0f4'},choiceOnText:{color:'#071724',fontWeight:'900'},
 calendarTitle:{color:'#fff',fontSize:23,fontWeight:'900',textAlign:'center',marginBottom:14},researchNotice:{color:'#ffcb6b',fontSize:12,textAlign:'center',lineHeight:19,marginBottom:12},calendarControls:{flexDirection:'row-reverse',alignItems:'stretch',gap:7},calendarButton:{flex:1,minHeight:46,borderWidth:1,borderColor:'#8f6827',borderRadius:12,alignItems:'center',justifyContent:'center',paddingHorizontal:5},calendarButtonText:{color:'#f4bb52',fontSize:12,fontWeight:'800',textAlign:'center'},todayButton:{minWidth:68,minHeight:46,backgroundColor:'#c89232',borderRadius:12,alignItems:'center',justifyContent:'center'},todayButtonText:{color:'#071724',fontWeight:'900'},weekRow:{flexDirection:'row',marginTop:16,marginBottom:4},weekDay:{width:'14.285%',color:'#9fb7c5',fontSize:10,fontWeight:'800',textAlign:'center'},dayGrid:{flexDirection:'row',flexWrap:'wrap',marginTop:4},dayCell:{width:'14.285%',height:46,borderRadius:10,alignItems:'center',justifyContent:'center'},dayCellBlank:{width:'14.285%',height:46},eventCell:{backgroundColor:'rgba(200,146,50,0.16)'},todayCell:{backgroundColor:'#c89232'},dayText:{color:'#eef4f7',fontWeight:'700'},eventDayText:{color:'#f4bb52',fontWeight:'900'},todayDayText:{color:'#071724',fontWeight:'900'},eventDot:{width:4,height:4,borderRadius:2,backgroundColor:'#f4bb52',marginTop:3},eventList:{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:'#21465e'},secondaryButton:{borderWidth:1,borderColor:'#c89232',padding:13,borderRadius:12,marginTop:10},secondaryButtonText:{color:'#f4bb52',fontWeight:'900',textAlign:'center'},cityChoice:{paddingVertical:11,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:'#1e4055'},cityChoiceActive:{backgroundColor:'rgba(200,146,50,.16)'},cityChoiceText:{color:'#dbe6ec',textAlign:'right'},cityChoiceTextActive:{color:'#f4bb52',textAlign:'right',fontWeight:'900'},policyText:{color:'#dbe6ec',textAlign:'right',lineHeight:25,marginTop:14},policyMeta:{color:'#91a9b7',textAlign:'right',lineHeight:21,marginTop:8,fontSize:12},compass:{width:260,height:260,borderRadius:130,borderWidth:4,borderColor:'#c89232',backgroundColor:'#061520',alignSelf:'center',marginTop:20,alignItems:'center',justifyContent:'center'},compassAligned:{borderColor:'#61d68a',shadowColor:'#61d68a',shadowOpacity:.7,shadowRadius:14,elevation:8},compassNorth:{position:'absolute',top:12,color:'#f4bb52',fontSize:18,fontWeight:'900'},qiblaNeedle:{position:'absolute',width:54,height:224,alignItems:'center',justifyContent:'space-between',paddingVertical:5},qiblaArrow:{color:'#f4bb52',fontSize:38,lineHeight:42},kaaba:{fontSize:30},compassCenter:{width:20,height:20,borderRadius:10,backgroundColor:'#f4bb52',borderWidth:4,borderColor:'#fff'},qiblaStatus:{color:'#f4bb52',fontWeight:'900',fontSize:18,textAlign:'center',marginTop:16},qiblaStatusAligned:{color:'#61d68a'},backButton:{alignSelf:'flex-end',borderWidth:1,borderColor:'#8f6827',borderRadius:12,paddingVertical:10,paddingHorizontal:14,marginTop:8},backButtonText:{color:'#f4bb52',fontWeight:'900'},dayCellOn:{backgroundColor:'#c89232',borderColor:'#c89232'},dayTextOn:{color:'#071724',fontWeight:'900'},nav:{position:'absolute',bottom:0,left:0,right:0,height:76,backgroundColor:'#061520',borderTopWidth:1,borderTopColor:'#21465e',flexDirection:'row',paddingTop:6},navb:{flex:1,alignItems:'center',justifyContent:'center',gap:2},navIcon:{color:'#7f98a6',fontSize:20,fontWeight:'700'},navIconActive:{color:'#f4bb52',fontSize:22,fontWeight:'900'},prayerLink:{marginTop:12,paddingVertical:10,alignItems:'center',borderTopWidth:1,borderTopColor:'#21465e'},prayerLinkText:{color:'#f4bb52',fontSize:14,fontWeight:'800'}
});
