import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,Switch,Alert,StatusBar,BackHandler,Platform} from 'react-native';
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
 'commons-aishatu98-adhan':require('./assets/adhan/adhan-aishatu98.ogg'),
 'commons-beautiful-adhan':require('./assets/adhan/beautiful-adhan.ogg'),
 'commons-andrewler-azan':require('./assets/adhan/azan-andrewler.ogg'),
 'commons-mecca-2013':require('./assets/adhan/mecca-adhan-2013.ogg')
};
const PRAYERS=[['الفجر','fajr'],['الشروق','sunrise'],['الظهر','dhuhr'],['العصر','asr'],['المغرب','maghrib'],['العشاء','isha']];
const WEEKDAYS=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const RAMADAN_VERSE='وَكُلُوا وَاشْرَبُوا حَتَّىٰ يَتَبَيَّنَ لَكُمُ الْخَيْطُ الْأَبْيَضُ مِنَ الْخَيْطِ الْأَسْوَدِ مِنَ الْفَجْرِ ۖ ثُمَّ أَتِمُّوا الصِّيَامَ إِلَى اللَّيْلِ';
const BAGHDAD_CHOICES=['iq-baghdad','iq-baghdad-outskirts','iq-adhamiya','iq-abu-ghraib','iq-taji','iq-mahmudiya','iq-madain','iq-fallujah'];

function formatArabicClock(d){return new Intl.DateTimeFormat('ar-IQ',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(d)}
function formatGregorian(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
function weekday(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long'}).format(d)}
function gregorianMonthTitle(d){return new Intl.DateTimeFormat('ar-IQ',{month:'long',year:'numeric'}).format(d)}
function shiftGregorianMonth(date,amount){const d=new Date(date);d.setDate(1);d.setMonth(d.getMonth()+amount);return d}
function distanceKm(a,b){const R=6371,rad=x=>x*Math.PI/180;const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
const religiousFor=(m,d,pack='common')=>religiousEvents.filter(e=>(e.pack==='common'||e.pack===pack)&&((e.m===m&&e.d===d)||(e.m===m&&e.range&&d>=e.range[0]&&d<=e.range[1])||(e.dates||[]).some(x=>x.m===m&&x.d===d)));
const nationalFor=(country,date)=>(nationalEvents[country]||[]).filter(e=>e.month===date.getUTCMonth()+1&&e.day===date.getUTCDate());
const eventsForDay=(country,date,lunar,pack)=>[...religiousFor(lunar.month,lunar.day,pack).map(e=>({type:'دينية',name:e.ar})),...nationalFor(country,date).map(e=>({type:'وطنية',name:e.name_ar}))];

export default function App(){
 const [tab,setTab]=useState('today');
 const [coords,setCoords]=useState({lat:33.3152,lon:44.3661});
 const [city,setCity]=useState(cities.find(x=>x.id==='iq-baghdad'));
 const [locState,setLocState]=useState('بغداد • افتراضي');
 const [adhanEnabled,setAdhanEnabled]=useState(true);
 const [now,setNow]=useState(new Date());
 const [locationBusy,setLocationBusy]=useState(false);
 const [method,setMethod]=useState('MWL');
 const [calendarDate,setCalendarDate]=useState(new Date());
 const [gregorianDate,setGregorianDate]=useState(new Date());
 const [selectedAdhan,setSelectedAdhan]=useState(null);
 const [showAdhanVoices,setShowAdhanVoices]=useState(false);
 const [showAdhanLicense,setShowAdhanLicense]=useState(false);
 const [language,setLanguage]=useState('ar');
 const [showLanguages,setShowLanguages]=useState(false);
const [eventPack,setEventPack]=useState('common');
 const [selectedCalendarEvent,setSelectedCalendarEvent]=useState(null);
 const [swipeStartX,setSwipeStartX]=useState(null);
 const [adhanSound,setAdhanSound]=useState(null);
 const [imsakAlertEnabled,setImsakAlertEnabled]=useState(true);
 const [iftarAlertEnabled,setIftarAlertEnabled]=useState(true);
 const [showWeeklyAd,setShowWeeklyAd]=useState(false);

 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);


 useEffect(()=>{
   let active=true;

   async function checkWeeklyAd(){
     try{
       const d=new Date();

       const first=new Date(d);
       const day=(d.getDay()+6)%7;
       first.setDate(d.getDate()-day);
       first.setHours(0,0,0,0);

       const weekKey=
         first.getFullYear()+'-'+
         String(first.getMonth()+1).padStart(2,'0')+'-'+
         String(first.getDate()).padStart(2,'0');

       const key='alofq_ad_week_'+weekKey;
       const count=Number(await AsyncStorage.getItem(key)||'0');

       if(count<2&&active){
         await AsyncStorage.setItem(key,String(count+1));
         setShowWeeklyAd(true);
       }else if(active){
         setShowWeeklyAd(false);
       }
     }catch(e){
       console.log('Weekly ad check error:',e);
     }
   }

   checkWeeklyAd();
   return()=>{active=false};
 },[]);

 async function closeWeeklyAd(){
   setShowWeeklyAd(false);
 }


 useEffect(()=>{useGps(false)},[]);

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
   }catch(e){
     setLocState('تعذر قراءة GPS');
     if(showMessage) Alert.alert('تعذر تحديد الموقع','تأكد من تشغيل GPS ومنح الإذن للتطبيق.');
   }finally{
     setLocationBusy(false);
   }
 }

 function chooseCity(id){
   const c=cities.find(x=>x.id===id);
   if(!c)return;
   setCity(c);
   setCoords({lat:c.lat,lon:c.lon});
   setLocState(`${c.name_ar} • اختيار يدوي`);
 }

 const tzOffsetMin=-now.getTimezoneOffset();

 const prayers=useMemo(()=>calculatePrayerTimes({
   date:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),12)),
   lat:coords.lat,
   lon:coords.lon,
   tzOffsetMin,
   method,
   asrFactor:1
 }).formatted,[coords.lat,coords.lon,now.toDateString(),method,tzOffsetMin]);

 const fastingData=useMemo(()=>calculateFastingTimes({
   date:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),12)),
   lat:coords.lat,
   lon:coords.lon,
   tzOffsetMin
 }),[coords.lat,coords.lon,now.toDateString(),tzOffsetMin]);

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

 const jd=jdFromDate(now);
 const illum=illumination(jd);
 const elong=elongationDeg(jd);
 const conj=findConjunctionNear(now);

 useEffect(()=>{
   let active=true;

   async function chooseInitialAdhan(){
     try{
       const manual=await AsyncStorage.getItem('alofq_adhan_manual');
       const savedId=await AsyncStorage.getItem('alofq_selected_adhan_id');

       if(manual==='1'&&savedId){
         const saved=adhanRegistry.find(p=>p.id===savedId&&p.status==='licensed');
         if(saved&&active){
           setSelectedAdhan(saved);
           return;
         }
       }

       const licensed=adhanRegistry.filter(p=>p.status==='licensed');
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

   async function setupFastingNotifications(){
     try{
       if(Platform.OS==='android'){
         await Notifications.setNotificationChannelAsync('fasting',{
           name:'تنبيهات الإمساك والإفطار',
           importance:Notifications.AndroidImportance.HIGH,
           vibrationPattern:[0,300,250,300]
         });
       }

       const current=await Notifications.getPermissionsAsync();
       let status=current.status;

       if(status!=='granted'){
         const req=await Notifications.requestPermissionsAsync();
         status=req.status;
       }

       if(status!=='granted'||!active)return;

       const scheduled=await Notifications.getAllScheduledNotificationsAsync();

       for(const n of scheduled){
         if(
           n.content?.data?.kind==='alofq-imsak'||
           n.content?.data?.kind==='alofq-iftar'
         ){
           await Notifications.cancelScheduledNotificationAsync(n.identifier);
         }
       }

       if(!isRamadan)return;

       const base=new Date(Date.UTC(
         now.getUTCFullYear(),
         now.getUTCMonth(),
         now.getUTCDate(),
         0,0,0
       ));

       function makeDate(mins){
         if(mins==null)return null;
         const d=new Date(base);
         d.setUTCMinutes(mins);
         return d;
       }

       const imsakDate=makeDate(fastingData.rawMinutesUtc.imsak);
       const iftarDate=makeDate(fastingData.rawMinutesUtc.iftar);

       if(imsakAlertEnabled&&imsakDate&&imsakDate>Date.now()){
         await Notifications.scheduleNotificationAsync({
           content:{
             title:'موعد الإمساك',
             body:'حان الآن موعد الإمساك بحسب المعيار الفلكي المعتمد في الأفق.',
             sound:true,
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
             sound:true,
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
   now.toDateString()
 ]);

 const packs=adhanRegistry.filter(p=>p.status==='licensed'&&p.asset);
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


 return <SafeAreaView style={s.root}>
  <ScrollView contentContainerStyle={s.page}>
   <View style={s.hero}>
    <Text style={s.appName}>الأفق</Text>
    <Text style={s.appSub}>{APP_VARIANT==='paid'?'النسخة المدفوعة • التقويم العربي والمواقيت':'النسخة التجريبية • التقويم العربي والمواقيت'}</Text>
    <Pressable style={s.locationPill} onPress={()=>useGps(true)}>
      <Text style={s.locationPin}>📍</Text>
      <Text style={s.locationText}>{locationBusy?'جاري تحديد الموقع...':locState}</Text>
    </Pressable>
   </View>
   {tab==='today'&&<>{showWeeklyAd&&<Card title='إعلان'>
  <Text style={s.text}>🕋 إعلان ديني موثوق</Text>
  <Text style={s.sub}>يُخصص هذا المكان لإعلانات الحج والعمرة أو المسابقات الرمضانية والدينية الموثوقة فقط.</Text>
  <Text style={s.sub}>لن يُفعّل أي رابط قبل التحقق من الجهة الرسمية.</Text>
  <Pressable style={s.primary} onPress={closeWeeklyAd}>
    <Text style={s.primaryText}>إغلاق الإعلان</Text>
  </Pressable>
</Card>}
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
    {isRamadan&&<Card title='رمضان — الإمساك والإفطار'><View style={s.pg}><View style={s.pi}><Text style={s.muted}>الإمساك</Text><Text style={s.gold}>{fasting.imsak}</Text></View><View style={s.pi}><Text style={s.muted}>الإفطار</Text><Text style={s.gold}>{fasting.iftar}</Text></View></View><View style={s.row}><Text style={s.text}>تنبيه موعد الإمساك</Text><Switch value={imsakAlertEnabled} onValueChange={setImsakAlertEnabled}/></View><View style={s.row}><Text style={s.text}>تنبيه موعد الإفطار</Text><Switch value={iftarAlertEnabled} onValueChange={setIftarAlertEnabled}/></View><Text style={s.sub}>سيُحسب موعد الإمساك وموعد الإفطار بشكل مستقل عن أذان الفجر والمغرب.</Text><Text style={[s.text,{marginTop:12,lineHeight:28}]}>{RAMADAN_VERSE}</Text><Text style={s.sub}>سورة البقرة — الآية 187</Text></Card>}
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
       {calendarDays.map(day=>{const date=new Date(calendarDate);date.setUTCDate(date.getUTCDate()+(day-calendarView.day));const ld=proposedLunisolarDate(date);const ev=eventsForDay(city.country,date,ld,eventPack);const isToday=ld.year===lunar.year&&ld.month===lunar.month&&ld.day===lunar.day;return <Pressable key={day} style={[s.dayCell,ev.length>0&&s.eventCell,isToday&&s.todayCell]} onPress={()=>{setCalendarDate(date);setSelectedCalendarEvent(ev)}}><Text style={[s.dayText,ev.length>0&&s.eventDayText,isToday&&s.todayDayText]}>{day}</Text>{ev.length>0&&<View style={s.eventDot}/>}</Pressable>})}
      </View>
      {selectedCalendarEvent&&selectedCalendarEvent.length>0&&<View style={s.eventList}>{selectedCalendarEvent.map((e,i)=><Text key={i} style={s.text}>• {e.type} — {e.name}</Text>)}</View>}
     </View>
    </Card>
    <Card title='التقويم الميلادي'>
     <Text style={s.calendarTitle}>{gregorianMonthTitle(gregorianDate)}</Text>
     <View style={s.calendarControls}>
      <Pressable style={s.calendarButton} onPress={()=>setGregorianDate(d=>shiftGregorianMonth(d,-1))}><Text style={s.calendarButtonText}>الشهر السابق</Text></Pressable>
      <Pressable style={s.todayButton} onPress={()=>setGregorianDate(new Date())}><Text style={s.todayButtonText}>اليوم</Text></Pressable>
      <Pressable style={s.calendarButton} onPress={()=>setGregorianDate(d=>shiftGregorianMonth(d,1))}><Text style={s.calendarButtonText}>الشهر القادم</Text></Pressable>
     </View>
     <View style={s.weekRow}>{WEEKDAYS.map(w=><Text key={w} style={s.weekDay}>{w}</Text>)}</View>
     <View style={s.dayGrid}>
      {Array.from({length:gregorianStartWeekday},(_,i)=><View key={`gregorian-blank-${i}`} style={s.dayCellBlank}/>)}
      {gregorianDays.map(day=>{const date=new Date(gregorianDate.getFullYear(),gregorianDate.getMonth(),day);const ld=proposedLunisolarDate(date);const ev=eventsForDay(city.country,date,ld,eventPack);const isToday=date.toDateString()===now.toDateString();return <Pressable key={day} style={[s.dayCell,ev.length>0&&s.eventCell,isToday&&s.todayCell]} onPress={()=>setSelectedCalendarEvent(ev)}><Text style={[s.dayText,ev.length>0&&s.eventDayText,isToday&&s.todayDayText]}>{day}</Text>{ev.length>0&&<View style={s.eventDot}/>}</Pressable>})}
     </View>
    </Card>
    <Card title='خيارات التقويم'>
     <Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?'جاري تحديد الموقع...':'📍 تحديث الموقع'}</Text></Pressable>
     <Pressable style={s.secondaryButton} onPress={()=>setTab('adhan')}><Text style={s.secondaryButtonText}>🔊 اختيار صوت الأذان</Text></Pressable>
    </Card>
   </>}
   {tab==='adhan'&&<>
    <Pressable style={s.backButton} onPress={()=>setTab('calendar')}><Text style={s.backButtonText}>← الرجوع إلى التقويم</Text></Pressable>
    <Card title='مواقيت الصلاة'><PrayerGrid p={prayers}/></Card>
    <Card title='إعداد الأذان'><View style={s.row}><Text style={s.text}>تشغيل تنبيهات الصلاة</Text><Switch value={adhanEnabled} onValueChange={setAdhanEnabled}/></View><Pressable style={s.primary} onPress={()=>setShowAdhanVoices(showAdhanVoices===false)}><Text style={s.primaryText}>🔊 اختيار صوت الأذان</Text></Pressable>{showAdhanVoices&&packs.map(p=><Pressable key={p.id} style={s.row} onPress={async()=>{setSelectedAdhan(p);await AsyncStorage.setItem('alofq_selected_adhan_id',p.id);await AsyncStorage.setItem('alofq_adhan_manual','1');setShowAdhanVoices(false);setShowAdhanLicense(false);previewAdhan(p)}}><Text style={s.text}>{p.display_ar}</Text></Pressable>)}{selectedAdhan&&<><View style={s.row}><Text style={s.text}>{selectedAdhan.display_ar}</Text><Pressable style={s.choice} onPress={()=>setShowAdhanLicense(showAdhanLicense===false)}><Text style={s.choiceText}>الترخيص</Text></Pressable></View>{showAdhanLicense&&<Text style={selectedAdhan.status==='licensed'?s.ok:s.warn}>{selectedAdhan.status==='licensed'?'✓ الترخيص: '+(selectedAdhan.license||'غير محدد')+' • المصدر: '+(selectedAdhan.source||'غير محدد'):(selectedAdhan.note_ar||'هذا التسجيل يحتاج إلى إثبات تصريح قبل إضافته للتطبيق.')}</Text>}</>}</Card>
   </>}
   {tab==='qibla'&&<><Card title='اتجاه القبلة'><Text style={s.hdate}>🕋 القبلة</Text><Text style={s.textCenter}>الاتجاه من موقعك الحالي</Text><Text style={[s.gold,{fontSize:28,textAlign:'center',marginTop:12}]}>{qiblaBearing.toFixed(1)}°</Text><Text style={s.subCenter}>حرّك الهاتف حتى يشير اتجاهك إلى هذه الدرجة في البوصلة.</Text><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?'جاري تحديث الموقع...':'📍 تحديث موقعي'}</Text></Pressable><Text style={s.coords}>{locState}</Text></Card></>}
{tab==='settings'&&<>
    <Card title='تحديد الموقع'><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>📍 تحديد موقعي تلقائيًا GPS</Text></Pressable><Text style={s.sub}>{locState}</Text></Card>
    <Card title='حقوق الملكية'><Text style={s.text}>© 2026 الأفق — جميع الحقوق محفوظة</Text><Text style={s.sub}>تصميم وفكرة وتطوير: وسام محمد</Text><Text style={s.sub}>يُحظر نسخ أو إعادة نشر أو تعديل أو توزيع التطبيق أو أي جزء من تصميمه أو شفرته البرمجية دون إذن مسبق من صاحب الحقوق، مع بقاء حقوق المكتبات والأصوات الخارجية لأصحابها وفق تراخيصها.</Text></Card>
<Card title='الإعدادات العامة'><Text style={s.text}>حزمة المناسبات</Text><View style={s.wrap}>{[['common','مشتركة'],['sunni','سنية'],['shia_imami','إمامية'],['historical','تاريخية']].map(([id,n])=><Pressable key={id} style={[s.choice,eventPack===id&&s.dayCellOn]} onPress={()=>setEventPack(id)}><Text style={eventPack===id?s.dayTextOn:s.choiceText}>{n}</Text></Pressable>)}</View></Card>
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
 root:{flex:1,backgroundColor:'#061724',paddingTop:StatusBar.currentHeight||0},page:{padding:16,paddingBottom:95},top:{gap:6},badge:{color:'#f4bb52',fontWeight:'800',textAlign:'right'},hero:{alignItems:'center',paddingTop:20,paddingBottom:8},appName:{color:'#f4bb52',fontSize:38,fontWeight:'900',textAlign:'center',marginTop:4},appSub:{color:'#d5dde2',fontSize:15,fontWeight:'700',textAlign:'center',marginTop:4,marginBottom:14},locationPill:{minWidth:'72%',maxWidth:'92%',paddingVertical:11,paddingHorizontal:16,borderRadius:24,borderWidth:1,borderColor:'#c89232',backgroundColor:'#0b2232',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},locationPin:{fontSize:18},locationText:{color:'#eef4f7',fontSize:15,fontWeight:'700',textAlign:'center',flexShrink:1},loc:{color:'#b5c7d1',textAlign:'right',fontSize:12,flexShrink:1,maxWidth:'72%'},clockCard:{alignItems:'center',paddingVertical:18,paddingHorizontal:14,marginTop:14,borderRadius:22,borderWidth:1,borderColor:'#8f6827',backgroundColor:'rgba(5,17,26,0.92)'},clock:{color:'#f4bb52',fontSize:28,fontWeight:'900',marginTop:8},week:{color:'#ffffff',fontSize:20,fontWeight:'900',marginBottom:8},hdate:{textAlign:'center',fontSize:27,fontWeight:'900',color:'#fff'},gdate:{textAlign:'center',fontSize:22,fontWeight:'800',color:'#fff'},textCenter:{color:'#eef4f7',textAlign:'center',marginTop:8},prayerHint:{color:'#9fb7c5',fontSize:13,fontWeight:'700',textAlign:'right',marginBottom:10},ramadanMini:{marginTop:14,width:'100%',backgroundColor:'#b9872f',borderRadius:16,paddingVertical:12,paddingHorizontal:14,alignItems:'center'},ramadanMiniTitle:{color:'#fff',fontSize:18,fontWeight:'900'},ramadanMiniText:{color:'#fff',fontSize:13,fontWeight:'700',marginTop:4,textAlign:'center'},
 moon:{width:150,height:150,borderRadius:75,backgroundColor:'#e6c578',alignSelf:'center',marginTop:20,overflow:'hidden'},shadow:{position:'absolute',right:0,top:0,bottom:0,backgroundColor:'#0c2638',borderTopLeftRadius:75,borderBottomLeftRadius:75},phase:{color:'#fff',textAlign:'center',marginTop:12,fontWeight:'700'},sub:{color:'#91a9b7',marginTop:8,textAlign:'right',lineHeight:21},subCenter:{color:'#91a9b7',marginTop:8,textAlign:'center'},
 card:{backgroundColor:'#091d2a',borderRadius:22,padding:17,marginTop:14,borderWidth:1,borderColor:'#8f6827',shadowColor:'#000',shadowOpacity:0.22,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:4},title:{color:'#f4bb52',fontSize:19,fontWeight:'900',textAlign:'right',marginBottom:12},text:{color:'#eef4f7',textAlign:'right',lineHeight:24},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#1e4055'},warn:{color:'#ffcb6b'},ok:{color:'#87d8a4'},
 pg:{flexDirection:'row',flexWrap:'wrap',gap:8},pi:{width:'31%',backgroundColor:'#091f2f',padding:12,borderRadius:12,alignItems:'center',borderWidth:1,borderColor:'#21465e'},gold:{color:'#f4bb52',fontWeight:'900',fontSize:17,marginTop:4},muted:{color:'#99b0bd'},active:{color:'#f4bb52',fontWeight:'900'},primary:{backgroundColor:'#c89232',padding:13,borderRadius:12,marginTop:12},primaryText:{color:'#071724',fontWeight:'900',textAlign:'center'},coords:{color:'#93aab7',textAlign:'center',marginTop:10,fontSize:12},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'flex-end'},choice:{paddingVertical:9,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'#31536a'},choiceOn:{backgroundColor:'#c89232',borderColor:'#c89232'},choiceText:{color:'#e8f0f4'},choiceOnText:{color:'#071724',fontWeight:'900'},
 calendarTitle:{color:'#fff',fontSize:23,fontWeight:'900',textAlign:'center',marginBottom:14},calendarControls:{flexDirection:'row-reverse',alignItems:'stretch',gap:7},calendarButton:{flex:1,minHeight:46,borderWidth:1,borderColor:'#8f6827',borderRadius:12,alignItems:'center',justifyContent:'center',paddingHorizontal:5},calendarButtonText:{color:'#f4bb52',fontSize:12,fontWeight:'800',textAlign:'center'},todayButton:{minWidth:68,minHeight:46,backgroundColor:'#c89232',borderRadius:12,alignItems:'center',justifyContent:'center'},todayButtonText:{color:'#071724',fontWeight:'900'},weekRow:{flexDirection:'row',marginTop:16,marginBottom:4},weekDay:{width:'14.285%',color:'#9fb7c5',fontSize:10,fontWeight:'800',textAlign:'center'},dayGrid:{flexDirection:'row',flexWrap:'wrap',marginTop:4},dayCell:{width:'14.285%',height:46,borderRadius:10,alignItems:'center',justifyContent:'center'},dayCellBlank:{width:'14.285%',height:46},eventCell:{backgroundColor:'rgba(200,146,50,0.16)'},todayCell:{backgroundColor:'#c89232'},dayText:{color:'#eef4f7',fontWeight:'700'},eventDayText:{color:'#f4bb52',fontWeight:'900'},todayDayText:{color:'#071724',fontWeight:'900'},eventDot:{width:4,height:4,borderRadius:2,backgroundColor:'#f4bb52',marginTop:3},eventList:{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:'#21465e'},secondaryButton:{borderWidth:1,borderColor:'#c89232',padding:13,borderRadius:12,marginTop:10},secondaryButtonText:{color:'#f4bb52',fontWeight:'900',textAlign:'center'},backButton:{alignSelf:'flex-end',borderWidth:1,borderColor:'#8f6827',borderRadius:12,paddingVertical:10,paddingHorizontal:14,marginTop:8},backButtonText:{color:'#f4bb52',fontWeight:'900'},dayCellOn:{backgroundColor:'#c89232',borderColor:'#c89232'},dayTextOn:{color:'#071724',fontWeight:'900'},nav:{position:'absolute',bottom:0,left:0,right:0,height:76,backgroundColor:'#061520',borderTopWidth:1,borderTopColor:'#21465e',flexDirection:'row',paddingTop:6},navb:{flex:1,alignItems:'center',justifyContent:'center',gap:2},navIcon:{color:'#7f98a6',fontSize:20,fontWeight:'700'},navIconActive:{color:'#f4bb52',fontSize:22,fontWeight:'900'},prayerLink:{marginTop:12,paddingVertical:10,alignItems:'center',borderTopWidth:1,borderTopColor:'#21465e'},prayerLinkText:{color:'#f4bb52',fontSize:14,fontWeight:'800'}
});
