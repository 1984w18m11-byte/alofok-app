import React,{useEffect,useMemo,useState} from 'react';
import {SafeAreaView,View,Text,ScrollView,Pressable,StyleSheet,Switch,Alert,StatusBar,BackHandler} from 'react-native';
import {Audio} from 'expo-av';
import * as Location from 'expo-location';
import cities from './src/data/cities.seed.json';
import nationalEvents from './src/data/national-events.json';
import religiousEvents from './src/data/events.json';
import adhanRegistry from './src/data/adhan-registry.json';
import {calculatePrayerTimes,calculateFastingTimes} from './src/engine/prayer';
import {jdFromDate,illumination,elongationDeg,findConjunctionNear} from './src/engine/astronomy';
import {proposedLunisolarDate,addLunisolarMonths,addLunisolarYears,lunisolarMonthLength} from './src/engine/lunisolar';

const fmtPct=x=>`${Math.round(x*100)}%`;
const ADHAN_ASSETS={
 'commons-aishatu98-adhan':require('./assets/adhan/adhan-aishatu98.ogg'),
 'commons-beautiful-adhan':require('./assets/adhan/beautiful-adhan.ogg')
};
const PRAYERS=[['الفجر','fajr'],['الشروق','sunrise'],['الظهر','dhuhr'],['العصر','asr'],['المغرب','maghrib'],['العشاء','isha']];
const RAMADAN_VERSE='وَكُلُوا وَاشْرَبُوا حَتَّىٰ يَتَبَيَّنَ لَكُمُ الْخَيْطُ الْأَبْيَضُ مِنَ الْخَيْطِ الْأَسْوَدِ مِنَ الْفَجْرِ ۖ ثُمَّ أَتِمُّوا الصِّيَامَ إِلَى اللَّيْلِ';
const BAGHDAD_CHOICES=['iq-baghdad','iq-baghdad-outskirts','iq-adhamiya','iq-abu-ghraib','iq-taji','iq-mahmudiya','iq-madain','iq-fallujah'];

function formatArabicClock(d){return new Intl.DateTimeFormat('ar-IQ',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(d)}
function formatGregorian(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
function weekday(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long'}).format(d)}
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

 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>{useGps(false)},[]);

 async function useGps(showMessage=true){
   try{
    setLocationBusy(true);
    const p=await Location.requestForegroundPermissionsAsync();
    if(p.status!=='granted'){setLocState('الموقع غير مسموح'); if(showMessage) Alert.alert('الموقع','فعّل إذن الموقع للتطبيق من إعدادات Android.');return}
    const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
    const c={lat:pos.coords.latitude,lon:pos.coords.longitude};setCoords(c);
    let nearest=cities[0],best=99999;for(const x of cities){const d=distanceKm(c,x);if(d<best){best=d;nearest=x}}
    let label='موقعي الحالي';
    try{const r=await Location.reverseGeocodeAsync(c);const g=r?.[0];label=[g?.country,g?.region,g?.city,g?.subregion,g?.district,g?.name].filter(Boolean).join(' • ')||nearest.name_ar}catch(e){label=nearest.name_ar}
    setCity(nearest);setLocState(`${label} • GPS (${c.lat.toFixed(4)}, ${c.lon.toFixed(4)})`);
   }catch(e){setLocState('تعذر قراءة GPS'); if(showMessage) Alert.alert('تعذر تحديد الموقع','تأكد من تشغيل GPS ومنح الإذن للتطبيق.')}
   finally{setLocationBusy(false)}
 }
 function chooseCity(id){const c=cities.find(x=>x.id===id);if(!c)return;setCity(c);setCoords({lat:c.lat,lon:c.lon});setLocState(`${c.name_ar} • اختيار يدوي`)}

 const tzOffsetMin=-now.getTimezoneOffset();
 const prayers=useMemo(()=>calculatePrayerTimes({date:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),12)),lat:coords.lat,lon:coords.lon,tzOffsetMin,method,asrFactor:1}).formatted,[coords.lat,coords.lon,now.toDateString(),method,tzOffsetMin]);
 const fasting=useMemo(()=>calculateFastingTimes({
  date:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),12)),
  lat:coords.lat,
  lon:coords.lon,
  tzOffsetMin
}).formatted,[coords.lat,coords.lon,now.toDateString(),tzOffsetMin]);
 const lunar=useMemo(()=>proposedLunisolarDate(now),[now.toDateString()]);
 const calendarView=useMemo(()=>proposedLunisolarDate(calendarDate),[calendarDate]);
 const calendarDays=Array.from({length:lunisolarMonthLength(calendarDate)},(_,i)=>i+1);
 const calendarMonthStart=useMemo(()=>{const d=new Date(calendarDate);d.setUTCDate(d.getUTCDate()-(calendarView.day-1));return d},[calendarDate,calendarView.day]);
 const calendarStartWeekday=calendarMonthStart.getUTCDay();
 const qiblaBearing=useMemo(()=>{const lat1=coords.lat*Math.PI/180,lon1=coords.lon*Math.PI/180,lat2=21.4225*Math.PI/180,lon2=39.8262*Math.PI/180;const y=Math.sin(lon2-lon1)*Math.cos(lat2);const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);return (Math.atan2(y,x)*180/Math.PI+360)%360},[coords.lat,coords.lon]);
 const jd=jdFromDate(now),illum=illumination(jd),elong=elongationDeg(jd),conj=findConjunctionNear(now);
 const packs=adhanRegistry.filter(p=>p.status==='licensed');
 async function previewAdhan(pack){
  try{
   if(adhanSound){await adhanSound.unloadAsync();setAdhanSound(null)}
   const asset=ADHAN_ASSETS[pack.id];
   if(!asset){Alert.alert("الصوت غير متوفر","ملف هذا الأذان غير موجود داخل التطبيق.");return}
   const {sound}=await Audio.Sound.createAsync(asset,{shouldPlay:true});
   setAdhanSound(sound);
  }catch(e){Alert.alert("خطأ","تعذر تشغيل صوت الأذان.")}
 }


 return <SafeAreaView style={s.root}>
  <ScrollView contentContainerStyle={s.page}>
   <View style={s.top}><Text style={s.appName}>الأفق</Text><Text style={s.appSub}>التقويم العربي والمواقيت</Text><View style={s.row}><Pressable onPress={()=>setShowLanguages(showLanguages===false)}><Text style={s.gold}>🌐 {language==='ar'?'العربية':language==='en'?'English':language==='fr'?'Français':'Español'}</Text></Pressable><Text style={s.loc}>{locState} 📍</Text></View>{showLanguages&&<View style={s.wrap}>{[['ar','العربية'],['en','English'],['fr','Français'],['es','Español']].map(([id,n])=><Pressable key={id} style={s.choice} onPress={()=>{setLanguage(id);setShowLanguages(false)}}><Text style={s.choiceText}>{n}</Text></Pressable>)}</View>}</View>
   {tab==='today'&&<>
    <View style={s.clockCard}><Text style={s.clock}>{formatArabicClock(now)}</Text><Text style={s.week}>{weekday(now)}</Text></View>
    <Card title='التاريخ القمري–الشمسي المقترح'>
      <Text style={s.hdate}>{lunar.day} {lunar.monthNameAr} {lunar.year}</Text>
      <Text style={s.sub}>تاريخ بحثي مستوحى من فكرة تثبيت الأشهر موسميًا؛ يحتاج المحرك النهائي إلى معايرة الرؤية والكبس قبل الاعتماد.</Text>
    </Card>
    <Card title='التاريخ الميلادي'><Text style={s.gdate}>{formatGregorian(now)}</Text><Text style={s.textCenter}>الساعة {formatArabicClock(now)}</Text></Card>
    <View style={s.moon}><View style={[s.shadow,{width:Math.max(8,140*(1-illum))}]}/></View>
    <Text style={s.phase}>إضاءة القمر {fmtPct(illum)} • الاستطالة {elong.toFixed(1)}°</Text>
    <Text style={s.subCenter}>أقرب اقتران محسوب: {conj.toLocaleString('ar-IQ')}</Text>
    <Card title='رمضان — الإمساك والإفطار'><View style={s.pg}><View style={s.pi}><Text style={s.muted}>الإمساك</Text><Text style={s.gold}>{fasting.imsak}</Text></View><View style={s.pi}><Text style={s.muted}>الإفطار</Text><Text style={s.gold}>{fasting.iftar}</Text></View></View><View style={s.row}><Text style={s.text}>تنبيه موعد الإمساك</Text><Switch value={imsakAlertEnabled} onValueChange={setImsakAlertEnabled}/></View><View style={s.row}><Text style={s.text}>تنبيه موعد الإفطار</Text><Switch value={iftarAlertEnabled} onValueChange={setIftarAlertEnabled}/></View><Text style={s.sub}>سيُحسب موعد الإمساك وموعد الإفطار بشكل مستقل عن أذان الفجر والمغرب.</Text><Text style={[s.text,{marginTop:12,lineHeight:28}]}>{RAMADAN_VERSE}</Text><Text style={s.sub}>سورة البقرة — الآية 187</Text></Card>
<Card title='مواقيت الصلاة اليوم'><PrayerGrid p={prayers} onPress={()=>setTab('adhan')}/><Pressable style={s.primary} onPress={()=>setTab('adhan')}><Text style={s.primaryText}>فتح صفحة مواقيت الصلاة والأذان</Text></Pressable></Card>
    <Card title='الموقع'><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?'جاري تحديد الموقع...':'استخدم GPS الآن'}</Text></Pressable><Text style={s.coords}>Lat {coords.lat.toFixed(5)} • Lon {coords.lon.toFixed(5)}</Text></Card>
   </>}
   {tab==="calendar"&&<Card title="التقويم القمري–الشمسي"><View onStartShouldSetResponder={()=>true} onResponderGrant={(e)=>setSwipeStartX(e.nativeEvent.pageX)} onResponderRelease={(e)=>{if(swipeStartX===null)return;const dx=e.nativeEvent.pageX-swipeStartX;if(dx>50)setCalendarDate(d=>addLunisolarMonths(d,-1));if(dx<-50)setCalendarDate(d=>addLunisolarMonths(d,1));setSwipeStartX(null)}}><Text style={s.hdate}>{calendarView.day} {calendarView.monthNameAr} {calendarView.year}</Text><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?"جاري تحديد الموقع...":"📍 تشغيل الموقع"}</Text></Pressable><Pressable style={s.primary} onPress={()=>setTab("adhan")}><Text style={s.primaryText}>🔊 اختيار صوت الأذان</Text></Pressable><View style={s.wrap}><Pressable style={[s.choice,s.choiceOn]} onPress={()=>setCalendarDate(d=>addLunisolarMonths(d,-1))}><Text style={s.choiceOnText}>‹ شهر</Text></Pressable><Pressable style={[s.choice,s.choiceOn]} onPress={()=>setCalendarDate(new Date())}><Text style={s.choiceOnText}>اليوم</Text></Pressable><Pressable style={[s.choice,s.choiceOn]} onPress={()=>setCalendarDate(d=>addLunisolarMonths(d,1))}><Text style={s.choiceOnText}>شهر ›</Text></Pressable><Pressable style={[s.choice,s.choiceOn]} onPress={()=>setCalendarDate(d=>addLunisolarYears(d,-1))}><Text style={s.choiceOnText}>‹ سنة</Text></Pressable><Pressable style={[s.choice,s.choiceOn]} onPress={()=>setCalendarDate(d=>addLunisolarYears(d,1))}><Text style={s.choiceOnText}>سنة ›</Text></Pressable></View><View style={s.weekRow}>{["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"].map(w=><Text key={w} style={s.weekDay}>{w}</Text>)}</View><View style={s.dayGrid}>{Array.from({length:calendarStartWeekday},(_,i)=><View key={`blank-${i}`} style={s.dayCellBlank}/>)}{calendarDays.map(d=>{const x=new Date(calendarDate);x.setUTCDate(x.getUTCDate()+(d-calendarView.day));const ld=proposedLunisolarDate(x);const ev=eventsForDay(city.country,x,ld,eventPack);return <Pressable key={d} style={[s.dayCell,ev.length>0&&s.dayCellOn,(ld.year===lunar.year&&ld.month===lunar.month&&ld.day===lunar.day)&&s.todayCell]} onPress={()=>{setCalendarDate(x);setSelectedCalendarEvent(ev)}}><Text style={ev.length>0?s.dayTextOn:s.dayText}>{d}</Text></Pressable>})}</View>{selectedCalendarEvent&&selectedCalendarEvent.length>0&&<View style={{marginTop:12}}>{selectedCalendarEvent.map((e,i)=><Text key={i} style={s.text}>• {e.type} — {e.name}</Text>)}</View>}</View></Card>}
   {tab==='adhan'&&<>
    <Card title='مواقيت الصلاة'><PrayerGrid p={prayers}/></Card>
    <Card title='إعداد الأذان'><View style={s.row}><Text style={s.text}>تشغيل تنبيهات الصلاة</Text><Switch value={adhanEnabled} onValueChange={setAdhanEnabled}/></View><Pressable style={s.primary} onPress={()=>setShowAdhanVoices(showAdhanVoices===false)}><Text style={s.primaryText}>🔊 اختيار صوت الأذان</Text></Pressable>{showAdhanVoices&&packs.map(p=><Pressable key={p.id} style={s.row} onPress={()=>{setSelectedAdhan(p);setShowAdhanVoices(false);setShowAdhanLicense(false);previewAdhan(p)}}><Text style={s.text}>{p.display_ar}</Text></Pressable>)}{selectedAdhan&&<><View style={s.row}><Text style={s.text}>{selectedAdhan.display_ar}</Text><Pressable style={s.choice} onPress={()=>setShowAdhanLicense(showAdhanLicense===false)}><Text style={s.choiceText}>الترخيص</Text></Pressable></View>{showAdhanLicense&&<Text style={selectedAdhan.status==='licensed'?s.ok:s.warn}>{selectedAdhan.status==='licensed'?'✓ الترخيص: '+(selectedAdhan.license||'غير محدد')+' • المصدر: '+(selectedAdhan.source||'غير محدد'):(selectedAdhan.note_ar||'هذا التسجيل يحتاج إلى إثبات تصريح قبل إضافته للتطبيق.')}</Text>}</>}</Card>
   </>}
   {tab==='qibla'&&<><Card title='اتجاه القبلة'><Text style={s.hdate}>🕋 القبلة</Text><Text style={s.textCenter}>الاتجاه من موقعك الحالي</Text><Text style={[s.gold,{fontSize:28,textAlign:'center',marginTop:12}]}>{qiblaBearing.toFixed(1)}°</Text><Text style={s.subCenter}>حرّك الهاتف حتى يشير اتجاهك إلى هذه الدرجة في البوصلة.</Text><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?'جاري تحديث الموقع...':'📍 تحديث موقعي'}</Text></Pressable><Text style={s.coords}>{locState}</Text></Card></>}
{tab==='settings'&&<>
    <Card title='تحديد الموقع'><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>📍 تحديد موقعي تلقائيًا GPS</Text></Pressable><Text style={s.sub}>{locState}</Text></Card>
    <Card title='حقوق الملكية'><Text style={s.text}>© 2026 الأفق — جميع الحقوق محفوظة</Text><Text style={s.sub}>تصميم وفكرة وتطوير: وسام محمد</Text><Text style={s.sub}>يُحظر نسخ أو إعادة نشر أو تعديل أو توزيع التطبيق أو أي جزء من تصميمه أو شفرته البرمجية دون إذن مسبق من صاحب الحقوق، مع بقاء حقوق المكتبات والأصوات الخارجية لأصحابها وفق تراخيصها.</Text></Card>
<Card title='الإعدادات العامة'><Text style={s.text}>حزمة المناسبات</Text><View style={s.wrap}>{[['common','مشتركة'],['sunni','سنية'],['shia_imami','إمامية'],['historical','تاريخية']].map(([id,n])=><Pressable key={id} style={[s.choice,eventPack===id&&s.dayCellOn]} onPress={()=>setEventPack(id)}><Text style={eventPack===id?s.dayTextOn:s.choiceText}>{n}</Text></Pressable>)}</View></Card>
   </>}
  </ScrollView>
  <View style={s.nav}>{[['today','الرئيسية'],['calendar','التقويم'],['adhan','الصلاة'],['qibla','القبلة'],['settings','الإعدادات']].map(([id,t])=><Pressable key={id} onPress={()=>setTab(id)} style={s.navb}><Text style={tab===id?s.active:s.muted}>{t}</Text></Pressable>)}</View>
 </SafeAreaView>
}
function Card({title,children}){return <View style={s.card}><Text style={s.title}>{title}</Text>{children}</View>}
function PrayerGrid({p,onPress}){return <View style={s.pg}>{PRAYERS.map(([a,k])=><Pressable onPress={onPress} style={s.pi} key={k}><Text style={s.muted}>{a}</Text><Text style={s.gold}>{p[k]}</Text></Pressable>)}</View>}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#061724',paddingTop:StatusBar.currentHeight||0},page:{padding:16,paddingBottom:95},top:{gap:6},badge:{color:'#f4bb52',fontWeight:'800',textAlign:'right'},appName:{color:'#f4bb52',fontSize:31,fontWeight:'900',textAlign:'center',marginTop:10},appSub:{color:'#d5dde2',fontSize:13,fontWeight:'700',textAlign:'center',marginBottom:5},loc:{color:'#b5c7d1',textAlign:'right',fontSize:12,flexShrink:1,maxWidth:'72%'},clockCard:{alignItems:'center',paddingTop:24},clock:{color:'#fff',fontSize:38,fontWeight:'900'},week:{color:'#9fb7c5',fontSize:18,marginTop:5},hdate:{textAlign:'center',fontSize:27,fontWeight:'900',color:'#fff'},gdate:{textAlign:'center',fontSize:22,fontWeight:'800',color:'#fff'},textCenter:{color:'#eef4f7',textAlign:'center',marginTop:8},
 moon:{width:150,height:150,borderRadius:75,backgroundColor:'#e6c578',alignSelf:'center',marginTop:20,overflow:'hidden'},shadow:{position:'absolute',right:0,top:0,bottom:0,backgroundColor:'#0c2638',borderTopLeftRadius:75,borderBottomLeftRadius:75},phase:{color:'#fff',textAlign:'center',marginTop:12,fontWeight:'700'},sub:{color:'#91a9b7',marginTop:8,textAlign:'right',lineHeight:21},subCenter:{color:'#91a9b7',marginTop:8,textAlign:'center'},
 card:{backgroundColor:'#0d293c',borderRadius:18,padding:15,marginTop:14,borderWidth:1,borderColor:'#21465e'},title:{color:'#f4bb52',fontSize:18,fontWeight:'800',textAlign:'right',marginBottom:10},text:{color:'#eef4f7',textAlign:'right',lineHeight:24},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#1e4055'},warn:{color:'#ffcb6b'},ok:{color:'#87d8a4'},
 pg:{flexDirection:'row',flexWrap:'wrap',gap:8},pi:{width:'31%',backgroundColor:'#091f2f',padding:12,borderRadius:12,alignItems:'center',borderWidth:1,borderColor:'#21465e'},gold:{color:'#f4bb52',fontWeight:'900',fontSize:17,marginTop:4},muted:{color:'#99b0bd'},active:{color:'#f4bb52',fontWeight:'900'},primary:{backgroundColor:'#c89232',padding:13,borderRadius:12,marginTop:12},primaryText:{color:'#071724',fontWeight:'900',textAlign:'center'},coords:{color:'#93aab7',textAlign:'center',marginTop:10,fontSize:12},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'flex-end'},choice:{paddingVertical:9,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'#31536a'},choiceOn:{backgroundColor:'#c89232',borderColor:'#c89232'},choiceText:{color:'#e8f0f4'},choiceOnText:{color:'#071724',fontWeight:'900'},
 dayGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12,justifyContent:'center'},dayCell:{width:'13%',minWidth:38,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:'#31536a',alignItems:'center'},dayCellBlank:{width:'13%',minWidth:38,paddingVertical:10},dayCellOn:{backgroundColor:'#c89232',borderColor:'#c89232'},dayText:{color:'#eef4f7',fontWeight:'700'},dayTextOn:{color:'#071724',fontWeight:'900'},nav:{position:'absolute',bottom:0,left:0,right:0,height:70,backgroundColor:'#061520',borderTopWidth:1,borderTopColor:'#21465e',flexDirection:'row'},navb:{flex:1,alignItems:'center',justifyContent:'center'}
});
