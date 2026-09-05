import React,{useEffect,useMemo,useState} from 'react';
import {SafeAreaView,View,Text,ScrollView,Pressable,StyleSheet,Switch,Alert,StatusBar,BackHandler} from 'react-native';
import * as Location from 'expo-location';
import cities from './src/data/cities.seed.json';
import nationalEvents from './src/data/national-events.json';
import adhanRegistry from './src/data/adhan-registry.json';
import {calculatePrayerTimes} from './src/engine/prayer';
import {jdFromDate,illumination,elongationDeg,findConjunctionNear} from './src/engine/astronomy';
import {proposedLunisolarDate,addLunisolarMonths,addLunisolarYears} from './src/engine/lunisolar';

const fmtPct=x=>`${Math.round(x*100)}%`;
const PRAYERS=[['الفجر','fajr'],['الشروق','sunrise'],['الظهر','dhuhr'],['العصر','asr'],['المغرب','maghrib'],['العشاء','isha']];
const BAGHDAD_CHOICES=['iq-baghdad','iq-baghdad-outskirts','iq-adhamiya','iq-abu-ghraib','iq-taji','iq-mahmudiya','iq-madain','iq-fallujah'];

function formatArabicClock(d){return new Intl.DateTimeFormat('ar-IQ',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(d)}
function formatGregorian(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
function weekday(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long'}).format(d)}
function distanceKm(a,b){const R=6371,rad=x=>x*Math.PI/180;const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}

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
    try{const r=await Location.reverseGeocodeAsync(c);const g=r?.[0];label=[g?.district,g?.subregion,g?.city].filter(Boolean)[0]||nearest.name_ar}catch(e){label=nearest.name_ar}
    setCity(nearest);setLocState(`${label} • GPS (${c.lat.toFixed(4)}, ${c.lon.toFixed(4)})`);
   }catch(e){setLocState('تعذر قراءة GPS'); if(showMessage) Alert.alert('تعذر تحديد الموقع','تأكد من تشغيل GPS ومنح الإذن للتطبيق.')}
   finally{setLocationBusy(false)}
 }
 function chooseCity(id){const c=cities.find(x=>x.id===id);if(!c)return;setCity(c);setCoords({lat:c.lat,lon:c.lon});setLocState(`${c.name_ar} • اختيار يدوي`)}

 const tzOffsetMin=-now.getTimezoneOffset();
 const prayers=useMemo(()=>calculatePrayerTimes({date:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),12)),lat:coords.lat,lon:coords.lon,tzOffsetMin,method,asrFactor:1}).formatted,[coords.lat,coords.lon,now.toDateString(),method,tzOffsetMin]);
 const lunar=useMemo(()=>proposedLunisolarDate(now),[now.toDateString()]);
 const calendarView=useMemo(()=>proposedLunisolarDate(calendarDate),[calendarDate]);
 const jd=jdFromDate(now),illum=illumination(jd),elong=elongationDeg(jd),conj=findConjunctionNear(now);
 const packs=adhanRegistry.filter(p=>(p.country==='*'||p.country===city.country)&&(p.city==='*'||p.city===city.id));

 return <SafeAreaView style={s.root}>
  <ScrollView contentContainerStyle={s.page}>
   <View style={s.top}><Text style={s.badge}>V2.1 • بحثي</Text><Text style={s.loc}>{locState} 📍</Text></View>
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
    <Card title='مواقيت الصلاة اليوم'><PrayerGrid p={prayers} onPress={()=>setTab('adhan')}/><Pressable style={s.primary} onPress={()=>setTab('adhan')}><Text style={s.primaryText}>فتح صفحة مواقيت الصلاة والأذان</Text></Pressable></Card>
    <Card title='الموقع'><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>{locationBusy?'جاري تحديد الموقع...':'استخدم GPS الآن'}</Text></Pressable><Text style={s.coords}>Lat {coords.lat.toFixed(5)} • Lon {coords.lon.toFixed(5)}</Text></Card>
   </>}
   {tab==='calendar'&&<Card title='التقويم القمري–الشمسي'><Text style={s.hdate}>{calendarView.day} {calendarView.monthNameAr} {calendarView.year}</Text><View style={s.wrap}><Pressable style={s.choice} onPress={()=>setCalendarDate(d=>addLunisolarMonths(d,-1))}><Text style={s.choiceText}>الشهر السابق</Text></Pressable><Pressable style={s.choice} onPress={()=>setCalendarDate(new Date())}><Text style={s.choiceText}>اليوم</Text></Pressable><Pressable style={s.choice} onPress={()=>setCalendarDate(d=>addLunisolarMonths(d,1))}><Text style={s.choiceText}>الشهر التالي</Text></Pressable><Pressable style={s.choice} onPress={()=>setCalendarDate(d=>addLunisolarYears(d,-1))}><Text style={s.choiceText}>السنة السابقة</Text></Pressable><Pressable style={s.choice} onPress={()=>setCalendarDate(d=>addLunisolarYears(d,1))}><Text style={s.choiceText}>السنة التالية</Text></Pressable></View><Text style={s.sub}>يمكنك التنقل بين الأشهر والسنوات السابقة واللاحقة.</Text></Card>}
   {tab==='events'&&<>
    <Card title='المناسبات الدينية'>
      <Text style={s.text}>عاشوراء • أول رمضان • ليالي القدر • عيد الفطر • يوم عرفة • عيد الأضحى. التواريخ المختلف عليها تظهر بحسب الحزمة والمصدر.</Text>
    </Card>
    <Card title='المناسبات الوطنية'>
      {(nationalEvents[city.country]||[]).length
        ? (nationalEvents[city.country]||[]).map((e,i)=><Text key={i} style={s.text}>• {e.day}/{e.month} — {e.name_ar}</Text>)
        : <Text style={s.sub}>لا توجد مناسبات وطنية مضافة لهذه الدولة حاليًا.</Text>}
    </Card>
   </>}
   {tab==='adhan'&&<>
    <Card title='مواقيت الصلاة'><PrayerGrid p={prayers}/></Card>
    <Card title='طريقة الحساب'><View style={s.wrap}>{[['MWL','رابطة العالم الإسلامي'],['EGYPT','الهيئة المصرية'],['KARACHI','كراتشي'],['UMM_AL_QURA','أم القرى']].map(([id,n])=><Pressable key={id} onPress={()=>setMethod(id)} style={[s.choice,method===id&&s.choiceOn]}><Text style={method===id?s.choiceOnText:s.choiceText}>{n}</Text></Pressable>)}</View></Card>
    <Card title='إعداد الأذان'><View style={s.row}><Text style={s.text}>تشغيل تنبيهات الصلاة</Text><Switch value={adhanEnabled} onValueChange={setAdhanEnabled}/></View>{packs.map(p=><View key={p.id} style={s.row}><Text style={s.text}>{p.display_ar}</Text><Text style={p.status==='licensed'?s.ok:s.warn}>{p.status==='licensed'?'مرخّص':'يحتاج تصريح'}</Text></View>)}</Card>
   </>}
   {tab==='settings'&&<>
    <Card title='تحديد الموقع'><Pressable style={s.primary} onPress={()=>useGps(true)}><Text style={s.primaryText}>📍 استخدم موقعي الحقيقي GPS</Text></Pressable><Text style={s.sub}>أو اختر المدينة يدويًا:</Text><View style={s.wrap}>{cities.map(c=><Pressable key={c.id} onPress={()=>chooseCity(c.id)} style={[s.choice,city.id===c.id&&s.choiceOn]}><Text style={city.id===c.id?s.choiceOnText:s.choiceText}>{c.name_ar}</Text></Pressable>)}</View></Card>
    <Card title='الإعدادات العامة'><Text style={s.text}>العربية • English • Français • Español</Text><Text style={s.text}>طريقة الصلاة قابلة للتغيير من صفحة الأذان.</Text><Text style={s.text}>حزمة المناسبات: مشتركة / سنية / إمامية / تاريخية.</Text></Card>
   </>}
  </ScrollView>
  <View style={s.nav}>{[['today','اليوم'],['calendar','التقويم'],['events','المناسبات'],['adhan','الصلاة'],['settings','الإعدادات']].map(([id,t])=><Pressable key={id} onPress={()=>setTab(id)} style={s.navb}><Text style={tab===id?s.active:s.muted}>{t}</Text></Pressable>)}</View>
 </SafeAreaView>
}
function Card({title,children}){return <View style={s.card}><Text style={s.title}>{title}</Text>{children}</View>}
function PrayerGrid({p,onPress}){return <View style={s.pg}>{PRAYERS.map(([a,k])=><Pressable onPress={onPress} style={s.pi} key={k}><Text style={s.muted}>{a}</Text><Text style={s.gold}>{p[k]}</Text></Pressable>)}</View>}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#061724',paddingTop:StatusBar.currentHeight||0},page:{padding:16,paddingBottom:95},top:{gap:6},badge:{color:'#f4bb52',fontWeight:'800',textAlign:'right'},loc:{color:'#b5c7d1',textAlign:'right',fontSize:12},clockCard:{alignItems:'center',paddingTop:24},clock:{color:'#fff',fontSize:38,fontWeight:'900'},week:{color:'#9fb7c5',fontSize:18,marginTop:5},hdate:{textAlign:'center',fontSize:27,fontWeight:'900',color:'#fff'},gdate:{textAlign:'center',fontSize:22,fontWeight:'800',color:'#fff'},textCenter:{color:'#eef4f7',textAlign:'center',marginTop:8},
 moon:{width:150,height:150,borderRadius:75,backgroundColor:'#e6c578',alignSelf:'center',marginTop:20,overflow:'hidden'},shadow:{position:'absolute',right:0,top:0,bottom:0,backgroundColor:'#0c2638',borderTopLeftRadius:75,borderBottomLeftRadius:75},phase:{color:'#fff',textAlign:'center',marginTop:12,fontWeight:'700'},sub:{color:'#91a9b7',marginTop:8,textAlign:'right',lineHeight:21},subCenter:{color:'#91a9b7',marginTop:8,textAlign:'center'},
 card:{backgroundColor:'#0d293c',borderRadius:18,padding:15,marginTop:14,borderWidth:1,borderColor:'#21465e'},title:{color:'#f4bb52',fontSize:18,fontWeight:'800',textAlign:'right',marginBottom:10},text:{color:'#eef4f7',textAlign:'right',lineHeight:24},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#1e4055'},warn:{color:'#ffcb6b'},ok:{color:'#87d8a4'},
 pg:{flexDirection:'row',flexWrap:'wrap',gap:8},pi:{width:'31%',backgroundColor:'#091f2f',padding:12,borderRadius:12,alignItems:'center',borderWidth:1,borderColor:'#21465e'},gold:{color:'#f4bb52',fontWeight:'900',fontSize:17,marginTop:4},muted:{color:'#99b0bd'},active:{color:'#f4bb52',fontWeight:'900'},primary:{backgroundColor:'#c89232',padding:13,borderRadius:12,marginTop:12},primaryText:{color:'#071724',fontWeight:'900',textAlign:'center'},coords:{color:'#93aab7',textAlign:'center',marginTop:10,fontSize:12},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'flex-end'},choice:{paddingVertical:9,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'#31536a'},choiceOn:{backgroundColor:'#c89232',borderColor:'#c89232'},choiceText:{color:'#e8f0f4'},choiceOnText:{color:'#071724',fontWeight:'900'},
 nav:{position:'absolute',bottom:0,left:0,right:0,height:70,backgroundColor:'#061520',borderTopWidth:1,borderTopColor:'#21465e',flexDirection:'row'},navb:{flex:1,alignItems:'center',justifyContent:'center'}
});
