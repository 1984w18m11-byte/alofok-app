import fs from 'node:fs';

const appPath='src/app/AppV3.js';
const qaPath='scripts/release-qa.js';
let app=fs.readFileSync(appPath,'utf8');
let qa=fs.readFileSync(qaPath,'utf8');

const mustReplace=(text,pattern,replacement,label)=>{
 const next=text.replace(pattern,replacement);
 if(next===text)throw new Error(`Patch failed: ${label}`);
 return next;
};

if(!app.includes("import religiousEvents from '../data/events.json';")){
 app=mustReplace(
  app,
  "import {useAdhanAudio} from './useAdhanAudio';",
  "import {useAdhanAudio} from './useAdhanAudio';\nimport religiousEvents from '../data/events.json';\nimport nationalEvents from '../data/national-events.json';",
  'event imports'
 );
}

if(!app.includes('function religiousEventsFor(')){
 app=mustReplace(
  app,
  "function rowDir(rtl){return {flexDirection:rtl?'row-reverse':'row'}}",
  `function rowDir(rtl){return {flexDirection:rtl?'row-reverse':'row'}}\nfunction religiousEventsFor(month,day){\n return religiousEvents.filter(item=>{\n  if(item.m===month&&item.d===day)return true;\n  return Array.isArray(item.dates)&&item.dates.some(x=>x.m===month&&x.d===day);\n });\n}\nfunction nationalEventsFor(country,month,day){\n return (nationalEvents[country]||[]).filter(item=>item.month===month&&item.day===day);\n}\nfunction eventLabel(item,rtl){\n return rtl?(item.ar||item.name_ar||''):(item.en||item.name_en||item.ar||item.name_ar||'');\n}`,
  'event helpers'
 );
}

const gregorianGrid=`function GregorianGrid({date,locale,t,rtl,onPrevious,onNext,onToday,country}){\n const year=date.getFullYear(),month=date.getMonth();\n const [selectedDay,setSelectedDay]=useState(null);\n useEffect(()=>{setSelectedDay(null)},[year,month,country]);\n const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),offset=first.getDay();\n const weekdayFmt=new Intl.DateTimeFormat(locale,{weekday:'short'});\n const headers=Array.from({length:7},(_,i)=>weekdayFmt.format(new Date(2026,0,4+i)));\n const cells=[...Array(offset).fill(null),...Array.from({length:days},(_,i)=>i+1)];\n const title=new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'}).format(date);\n const today=new Date();\n const eventsForDay=day=>nationalEventsFor(country,month+1,day);\n const selectedEvents=selectedDay?eventsForDay(selectedDay):[];\n return <>\n  <View style={[s.calendarNav,rowDir(rtl)]}>\n   <Pressable onPress={onPrevious} style={s.navSmall}><Text style={s.navSmallText}>‹</Text></Pressable>\n   <Pressable onPress={onToday}><Text style={s.calendarMonthTitle}>{title}</Text></Pressable>\n   <Pressable onPress={onNext} style={s.navSmall}><Text style={s.navSmallText}>›</Text></Pressable>\n  </View>\n  <View style={s.weekHeader}>{headers.map((x,i)=><Text key={\`${'${x}'}-${'${i}'}\`} style={s.weekHeaderText}>{x}</Text>)}</View>\n  <View style={s.calendarGrid}>{cells.map((d,i)=>{\n   const events=d==null?[]:eventsForDay(d);\n   const isToday=d!=null&&d===today.getDate()&&year===today.getFullYear()&&month===today.getMonth();\n   const highlighted=isToday||events.length>0;\n   return <Pressable key={i} disabled={d==null} onPress={()=>setSelectedDay(d)} style={s.dayCell}>{d!=null&&<Text style={[s.dayText,highlighted?s.dayToday:null]}>{d}</Text>}</Pressable>;\n  })}</View>\n  {selectedEvents.length>0&&<View style={s.eventNotice}>{selectedEvents.map((item,i)=><Text key={i} style={[s.eventNoticeText,textDir(rtl)]}>• {rtl?'وطنية':'National'} — {eventLabel(item,rtl)}</Text>)}</View>}\n  <Pressable onPress={onToday} style={s.inlineLink}><Text style={s.inlineLinkText}>{t('today')}</Text></Pressable>\n </>\n}`;

app=mustReplace(app,/function GregorianGrid\([\s\S]*?\n}\n\n(?=function HijriGrid)/,gregorianGrid+'\n\n','GregorianGrid');

const hijriGrid=`function HijriGrid({date,currentDate,locale,t,rtl,onPrevious,onNext,onToday}){\n const info=proposedLunisolarDate(date);\n const todayInfo=proposedLunisolarDate(currentDate||new Date());\n const [selectedDay,setSelectedDay]=useState(null);\n useEffect(()=>{setSelectedDay(null)},[info.year,info.month]);\n const monthLength=lunisolarMonthLength(date);\n const start=new Date(date);start.setUTCDate(start.getUTCDate()-(info.day-1));\n const offset=start.getUTCDay();\n const cells=[...Array(offset).fill(null),...Array.from({length:monthLength},(_,i)=>i+1)];\n const title=\`${'${rtl?info.monthNameAr:monthName(info.month,\'en\')}'} ${'${info.year}'}\`;\n const weekdayFmt=new Intl.DateTimeFormat(locale,{weekday:'short'});\n const headers=Array.from({length:7},(_,i)=>weekdayFmt.format(new Date(2026,0,4+i)));\n const eventsForDay=day=>religiousEventsFor(info.month,day);\n const selectedEvents=selectedDay?eventsForDay(selectedDay):[];\n return <>\n  <View style={[s.calendarNav,rowDir(rtl)]}>\n   <Pressable onPress={onPrevious} style={s.navSmall}><Text style={s.navSmallText}>‹</Text></Pressable>\n   <Pressable onPress={onToday}><Text style={s.calendarMonthTitle}>{title}</Text></Pressable>\n   <Pressable onPress={onNext} style={s.navSmall}><Text style={s.navSmallText}>›</Text></Pressable>\n  </View>\n  <View style={s.weekHeader}>{headers.map((x,i)=><Text key={\`${'${x}'}-${'${i}'}\`} style={s.weekHeaderText}>{x}</Text>)}</View>\n  <View style={s.calendarGrid}>{cells.map((d,i)=>{\n   const events=d==null?[]:eventsForDay(d);\n   const isToday=d!=null&&d===todayInfo.day&&info.month===todayInfo.month&&info.year===todayInfo.year;\n   const highlighted=isToday||events.length>0;\n   return <Pressable key={i} disabled={d==null} onPress={()=>setSelectedDay(d)} style={s.dayCell}>{d!=null&&<Text style={[s.dayText,highlighted?s.dayToday:null]}>{d}</Text>}</Pressable>;\n  })}</View>\n  {selectedEvents.length>0&&<View style={s.eventNotice}>{selectedEvents.map((item,i)=><Text key={i} style={[s.eventNoticeText,textDir(rtl)]}>• {rtl?'دينية':'Religious'} — {eventLabel(item,rtl)}</Text>)}</View>}\n  {info.isLeapYear&&<Text style={[s.note,textDir(rtl)]}>{rtl?'السنة الكبيسة: 13 شهرًا، والشهر الثالث عشر هو شهر النسيء.':'Leap research year: 13 months; the thirteenth is Nasi.'}</Text>}\n </>\n}`;

app=mustReplace(app,/function HijriGrid\([\s\S]*?\n}\n\n(?=function Drawer)/,hijriGrid+'\n\n','HijriGrid');

app=mustReplace(
 app,
 /\n    <View style=\{\[s\.dualCards,rowDir\(rtl\)\]\}>[\s\S]*?<\/View>\n\n    <SectionCard title=\{t\('hijriCalendar'\)\}/,
 "\n    <SectionCard title={t('hijriCalendar')}",
 'remove mini calendar cards'
);

app=mustReplace(
 app,
 "<HijriGrid date={hijriDate} locale={locale} t={t} rtl={rtl}",
 "<HijriGrid date={hijriDate} currentDate={now} locale={locale} t={t} rtl={rtl}",
 'pass current Hijri date'
);
app=mustReplace(
 app,
 "<GregorianGrid date={gregDate} locale={locale} t={t} rtl={rtl}",
 "<GregorianGrid date={gregDate} locale={locale} t={t} rtl={rtl} country={location.country}",
 'pass country to Gregorian calendar'
);

if(!app.includes('eventNotice:{')){
 app=mustReplace(
  app,
  "inlineLinkText:{color:GOLD,fontWeight:'700'},note:{color:MUTED,fontSize:12,lineHeight:19,marginTop:8},",
  "inlineLinkText:{color:GOLD,fontWeight:'700'},eventNotice:{marginTop:10,borderRadius:12,borderWidth:1,borderColor:GOLD_SOFT,backgroundColor:'rgba(244,196,93,.13)',paddingHorizontal:12,paddingVertical:9},eventNoticeText:{color:'#FFE7A6',fontSize:12,fontWeight:'700',lineHeight:19},note:{color:MUTED,fontSize:12,lineHeight:19,marginTop:8},",
  'event notice styles'
 );
}

if(!qa.includes('mini calendar summary cards must stay removed')){
 qa=mustReplace(
  qa,
  "assert(!app.includes('<View style={s.supportQuickWrap}>'),'large home support block must remain removed');",
  "assert(!app.includes('<View style={s.supportQuickWrap}>'),'large home support block must remain removed');\nassert(!app.includes('<View style={[s.dualCards,rowDir(rtl)]}>'),'mini calendar summary cards must stay removed');\nassert(app.includes(\"import religiousEvents from '../data/events.json';\")&&app.includes(\"import nationalEvents from '../data/national-events.json';\"),'calendar event data must be wired into the app');\nassert(app.includes('info.month===todayInfo.month&&info.year===todayInfo.year'),'Hijri today highlight must match day, month, and year');\nassert(app.includes('country={location.country}'),'Gregorian national events must follow the selected/current country');\nassert(app.includes('religiousEventsFor(info.month,day)'),'Hijri religious events must be enabled');\nassert(app.includes('nationalEventsFor(country,month+1,day)'),'Gregorian national events must be enabled');",
  'calendar QA assertions'
 );
}

fs.writeFileSync(appPath,app);
fs.writeFileSync(qaPath,qa);
console.log('Applied calendar UI/event fix to',appPath,'and',qaPath);
