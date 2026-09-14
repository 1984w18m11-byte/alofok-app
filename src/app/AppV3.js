import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Alert,Image,ImageBackground,Linking,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {calculatePrayerTimes} from '../engine/prayer';
import {addLunisolarMonths,lunisolarMonthLength,monthName,proposedLunisolarDate} from '../engine/lunisolar';
import {LOCALES} from '../i18n/locales';
import {makeV3Translator,v3IsRtl,v3LocaleTag} from './v3Strings';
import {HOME_REFERENCE_BACKGROUND,THEME_BY_ID,THEME_CATALOG,automaticThemeId} from './themeCatalog';
import {useDeviceLocation} from './useDeviceLocation';
import {useAdhanAudio} from './useAdhanAudio';
import religiousEvents from '../data/events.json';
import nationalEvents from '../data/national-events.json';
import religiousEventsExtra from '../data/religious-events-extra.json';
import {useCountryHolidays} from './useCountryHolidays';
import {AuthenticityScreen,CopyrightScreen,PrivacyScreen} from './LegalScreens';
import {AdvertiseScreen,TrialAdOverlay,useTrialAd} from './TrialAds';

const GOLD='#F4C45D';
const GOLD_SOFT='#DCA94B';
const NAVY='#06182B';
const NAVY_2='#0B223A';
const CARD='rgba(8,25,43,0.88)';
const CARD_2='rgba(17,34,52,0.82)';
const LINE='rgba(255,255,255,0.15)';
const MUTED='#B9C4D1';
const WHITE='#F7F8FB';
const VERSION='1.0.0';
const IS_PLUS=process.env.EXPO_PUBLIC_APP_VARIANT==='paid';
const UPDATE_URL=IS_PLUS
 ?'https://raw.githubusercontent.com/1984w18m11-byte/alofok-app/main/update-plus.json'
 :'https://raw.githubusercontent.com/1984w18m11-byte/alofok-app/main/update-trial.json';
const LANGUAGE_KEY='alofok_v3_language';
const THEME_KEY='alofok_v3_theme';
const SUPPORT_ACCOUNT=process.env.EXPO_PUBLIC_SUPPORT_ACCOUNT||'';

function civilDateForTimeZone(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return new Date(Date.UTC(Number(v.year),Number(v.month)-1,Number(v.day),12));
 }catch(e){return new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),12))}
}
function timeZoneOffsetMinutes(date,timeZone){
 try{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const represented=Date.UTC(+v.year,+v.month-1,+v.day,+v.hour,+v.minute,+v.second);
  return Math.round((represented-date.getTime())/60000);
 }catch(e){return -date.getTimezoneOffset()}
}
function utcDateFromMinutes(civilDate,minutes){
 if(minutes==null)return null;
 const d=new Date(Date.UTC(civilDate.getUTCFullYear(),civilDate.getUTCMonth(),civilDate.getUTCDate(),0,0,0));
 d.setUTCMinutes(minutes);return d;
}
function isNewer(remote,current){
 const a=String(remote||'').split('.').map(Number),b=String(current||'').split('.').map(Number);
 for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0)}
 return false;
}
function textDir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}
function rowDir(rtl){return {flexDirection:rtl?'row-reverse':'row'}}
function religiousEventsFor(month,day){
 return [...religiousEvents,...religiousEventsExtra].filter(item=>{
  if(item.m===month&&item.d===day)return true;
  return Array.isArray(item.dates)&&item.dates.some(x=>x.m===month&&x.d===day);
 });
}
function nationalEventsFor(country,month,day){
 return (nationalEvents[country]||[]).filter(item=>item.month===month&&item.day===day);
}
function eventLabel(item,rtl){
 return rtl?(item.ar||item.name_ar||item.name||item.name_en||''):(item.en||item.name_en||item.name||item.ar||item.name_ar||'');
}

function IconButton({label,onPress,children,accent=false}){
 return <Pressable accessibilityLabel={label} onPress={onPress} style={[s.iconButton,accent&&s.iconButtonGold]}><Text style={[s.iconButtonText,accent&&{color:GOLD}]}>{children}</Text></Pressable>
}
function Header({title,t,rtl,onBack}){
 return <View style={[s.screenHeader,rowDir(rtl)]}>
  <IconButton label={t('back')} onPress={onBack}>‹</IconButton>
  <Text style={[s.screenTitle,textDir(rtl)]}>{title}</Text>
  <View style={s.headerSpacer}/>
 </View>
}
function SectionCard({title,children,rtl,action}){
 return <View style={s.sectionCard}>
  <View style={[s.sectionTitleRow,rowDir(rtl)]}><Text style={[s.sectionTitle,textDir(rtl)]}>{title}</Text>{action||null}</View>
  {children}
 </View>
}
function CheckRow({text,rtl,gold=false}){
 return <View style={[s.checkRow,rowDir(rtl)]}><View style={[s.checkDot,gold&&s.checkDotGold]}><Text style={s.checkMark}>✓</Text></View><Text style={[s.checkText,textDir(rtl)]}>{text}</Text></View>
}
function prayerIcon(key){return {fajr:'◒',sunrise:'◉',dhuhr:'☀',asr:'☼',maghrib:'◐',isha:'☾'}[key]||'•'}
const PRAYER_KEYS=['fajr','sunrise','dhuhr','asr','maghrib','isha'];

function PrayerStrip({times,t,rtl}){
 return <View style={[s.prayerStrip,rowDir(rtl)]}>
  {PRAYER_KEYS.map(key=><View key={key} style={s.prayerItem}>
   <Text style={[s.prayerIcon,key==='dhuhr'||key==='asr'?{color:GOLD}:null]}>{prayerIcon(key)}</Text>
   <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={s.prayerName}>{t(key)}</Text>
   <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={s.prayerTime}>{times[key]}</Text>
  </View>)}
 </View>
}

function GregorianGrid({date,locale,t,rtl,onPrevious,onNext,onToday,country}){
 const year=date.getFullYear(),month=date.getMonth();
 const countryHolidays=useCountryHolidays(country,year);
 const [selectedDay,setSelectedDay]=useState(null);
 useEffect(()=>{setSelectedDay(null)},[year,month,country]);
 const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),offset=first.getDay();
 const weekdayFmt=new Intl.DateTimeFormat(locale,{weekday:'short'});
 const headers=Array.from({length:7},(_,i)=>weekdayFmt.format(new Date(2026,0,4+i)));
 const cells=[...Array(offset).fill(null),...Array.from({length:days},(_,i)=>i+1)];
 const title=new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'}).format(date);
 const today=new Date();
 const eventsForDay=day=>{
  const ymd=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return (countryHolidays.items||[]).filter(item=>item.date===ymd);
 };
 const selectedEvents=selectedDay?eventsForDay(selectedDay):[];
 return <>
  <View style={[s.calendarNav,rowDir(rtl)]}>
   <Pressable onPress={onPrevious} style={s.navSmall}><Text style={s.navSmallText}>‹</Text></Pressable>
   <Pressable onPress={onToday}><Text style={s.calendarMonthTitle}>{title}</Text></Pressable>
   <Pressable onPress={onNext} style={s.navSmall}><Text style={s.navSmallText}>›</Text></Pressable>
  </View>
  <View style={s.weekHeader}>{headers.map((x,i)=><Text key={`${x}-${i}`} style={s.weekHeaderText}>{x}</Text>)}</View>
  <View style={s.calendarGrid}>{cells.map((d,i)=>{
   const events=d==null?[]:eventsForDay(d);
   const isToday=d!=null&&d===today.getDate()&&year===today.getFullYear()&&month===today.getMonth();
   const highlighted=isToday||events.length>0;
   return <Pressable key={i} disabled={d==null} onPress={()=>setSelectedDay(d)} style={s.dayCell}>{d!=null&&<Text style={[s.dayText,highlighted?s.dayToday:null]}>{d}</Text>}</Pressable>;
  })}</View>
  {selectedEvents.length>0&&<View style={s.eventNotice}>{selectedEvents.map((item,i)=><Text key={i} style={[s.eventNoticeText,textDir(rtl)]}>• {rtl?'وطنية':'National'} — {eventLabel(item,rtl)}</Text>)}</View>}
  <Pressable onPress={onToday} style={s.inlineLink}><Text style={s.inlineLinkText}>{t('today')}</Text></Pressable>
 </>
}

function HijriGrid({date,currentDate,locale,t,rtl,onPrevious,onNext,onToday}){
 const info=proposedLunisolarDate(date);
 const todayInfo=proposedLunisolarDate(currentDate||new Date());
 const [selectedDay,setSelectedDay]=useState(null);
 useEffect(()=>{setSelectedDay(null)},[info.year,info.month]);
 const monthLength=lunisolarMonthLength(date);
 const start=new Date(date);start.setUTCDate(start.getUTCDate()-(info.day-1));
 const offset=start.getUTCDay();
 const cells=[...Array(offset).fill(null),...Array.from({length:monthLength},(_,i)=>i+1)];
 const title=`${rtl?info.monthNameAr:monthName(info.month,'en')} ${info.year}`;
 const weekdayFmt=new Intl.DateTimeFormat(locale,{weekday:'short'});
 const headers=Array.from({length:7},(_,i)=>weekdayFmt.format(new Date(2026,0,4+i)));
 const eventsForDay=day=>religiousEventsFor(info.month,day);
 const selectedEvents=selectedDay?eventsForDay(selectedDay):[];
 return <>
  <View style={[s.calendarNav,rowDir(rtl)]}>
   <Pressable onPress={onPrevious} style={s.navSmall}><Text style={s.navSmallText}>‹</Text></Pressable>
   <Pressable onPress={onToday}><Text style={s.calendarMonthTitle}>{title}</Text></Pressable>
   <Pressable onPress={onNext} style={s.navSmall}><Text style={s.navSmallText}>›</Text></Pressable>
  </View>
  <View style={s.weekHeader}>{headers.map((x,i)=><Text key={`${x}-${i}`} style={s.weekHeaderText}>{x}</Text>)}</View>
  <View style={s.calendarGrid}>{cells.map((d,i)=>{
   const events=d==null?[]:eventsForDay(d);
   const isToday=d!=null&&d===todayInfo.day&&info.month===todayInfo.month&&info.year===todayInfo.year;
   const highlighted=isToday||events.length>0;
   return <Pressable key={i} disabled={d==null} onPress={()=>setSelectedDay(d)} style={s.dayCell}>{d!=null&&<Text style={[s.dayText,highlighted?s.dayToday:null]}>{d}</Text>}</Pressable>;
  })}</View>
  {selectedEvents.length>0&&<View style={s.eventNotice}>{selectedEvents.map((item,i)=><Text key={i} style={[s.eventNoticeText,textDir(rtl)]}>• {rtl?'دينية':'Religious'} — {eventLabel(item,rtl)}</Text>)}</View>}
  {info.isLeapYear&&<Text style={[s.note,textDir(rtl)]}>{rtl?'السنة الكبيسة: 13 شهرًا، والشهر الثالث عشر هو شهر النسيء.':'Leap research year: 13 months; the thirteenth is Nasi.'}</Text>}
 </>
}

function Drawer({t,rtl,onClose,onNavigate,onUpdate}){
 const items=[
  ['⚙','settings','settings'],['⟳','checkUpdate','update'],['♛','subscription','plus'],['◉','support','support'],...(!IS_PLUS?[['▣','advertise','advertise']]:[]),['◎','languages','languages'],['ⓘ','about','about'],['◇','privacy','privacy']
 ];
 return <View style={s.drawerBackdrop}>
  <Pressable style={s.drawerDismiss} onPress={onClose}/>
  <View style={[s.drawer,rtl?{right:0}:{left:0}]}>
   <SafeAreaView style={s.drawerSafe}>
    <Pressable onPress={onClose} style={s.drawerClose}><Text style={s.drawerCloseText}>×</Text></Pressable>
    <View style={s.drawerBrand}><View style={s.logoTile}><Text style={s.logoTileText}>◩</Text></View><Text style={s.drawerAppName}>{t('appName')}</Text><Text style={s.drawerTagline}>{t('tagline')}</Text></View>
    <View style={s.drawerLine}/>
    {items.map(([icon,key,target])=><Pressable key={target} onPress={()=>target==='update'?onUpdate():onNavigate(target)} style={[s.drawerItem,rowDir(rtl)]}><Text style={s.drawerItemIcon}>{icon}</Text><Text style={[s.drawerItemText,textDir(rtl)]}>{t(key)}</Text></Pressable>)}
    <View style={s.drawerBottom}><Text style={[s.drawerSlogan,textDir(rtl)]}>{rtl?'كل يوم في تقويمنا\nحكاية من أمتنا':'Every day in our calendar\ntells a story from our heritage'}</Text></View>
   </SafeAreaView>
  </View>
 </View>
}

function HomeScreen({t,rtl,locale,location,prayers,lunar,now,onMenu,onGps,onNavigate,themeSource,hijriDate,setHijriDate,gregDate,setGregDate}){
 const gregDay=new Intl.DateTimeFormat(locale,{day:'numeric'}).format(now);
 const gregMonth=new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'}).format(now);
 const week=new Intl.DateTimeFormat(locale,{weekday:'long'}).format(now);
 const gregLong=new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric'}).format(now);
 const hMonth=rtl?lunar.monthNameAr:monthName(lunar.month,'en');
 return <ImageBackground source={themeSource} resizeMode='cover' style={s.homeBg} imageStyle={s.homeBgImage}>
  <View style={s.homeShade}/>
  <SafeAreaView style={s.safe}>
   <ScrollView contentContainerStyle={s.homeContent} showsVerticalScrollIndicator={false}>
    <View style={s.heroTop}>
     <IconButton label={t('menu')} onPress={onMenu}>☰</IconButton>
     <View style={s.locationWrap}>
      <Pressable onPress={onGps} style={s.gpsPill}><Text style={s.gpsText}>{location.busy?'…':'⌖'}  {t('gps')}</Text></Pressable>
      <Text numberOfLines={1} style={[s.locationLabel,textDir(rtl)]}>{location.busy?t('locating'):location.label}</Text>
      {!!location.accuracy&&<Text style={s.accuracyText}>{t('accuracy')} ±{Math.round(location.accuracy)}m</Text>}
     </View>
    </View>

    <View style={s.dateHero}>
     <Text style={s.hijriHero}>{week}  {lunar.day} {hMonth} {lunar.year} {rtl?'هـ':'AH'}</Text>
     <Text style={s.gregHero}>{gregLong}</Text>
    </View>

    <View style={s.visualSpace}/>
    <View style={s.quoteBlock}><Text style={s.quoteText}>{rtl?'﴿ وَمَا كَانَ رَبُّكَ نَسِيًّا ﴾':'“Your Lord is never forgetful.”'}</Text><Text style={s.quoteSub}>{rtl?'كل يوم هو فرصة لقرب جديد':'Every day is a new opportunity'}</Text></View>

    <View style={s.glassPanel}>
     <View style={[s.panelHeading,rowDir(rtl)]}><Text style={s.panelTitle}>{t('prayerTimes')}</Text><Pressable onPress={()=>onNavigate('adhan')}><Text style={s.panelAction}>{t('showAll')}  ›</Text></Pressable></View>
     <PrayerStrip times={prayers.formatted} t={t} rtl={rtl}/>
    </View>

    <SectionCard title={t('hijriCalendar')} rtl={rtl}>
     <HijriGrid date={hijriDate} currentDate={now} locale={locale} t={t} rtl={rtl} onPrevious={()=>setHijriDate(d=>addLunisolarMonths(d,-1))} onNext={()=>setHijriDate(d=>addLunisolarMonths(d,1))} onToday={()=>setHijriDate(new Date())}/>
    </SectionCard>
    <SectionCard title={t('gregorianCalendar')} rtl={rtl}>
     <GregorianGrid date={gregDate} locale={locale} t={t} rtl={rtl} country={location.country} onPrevious={()=>setGregDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))} onNext={()=>setGregDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))} onToday={()=>setGregDate(new Date())}/>
    </SectionCard>
   </ScrollView>
  </SafeAreaView>
 </ImageBackground>
}

function AdhanScreen({t,rtl,adhan,onBack}){
 return <SafeAreaView style={s.flatSafe}><ScrollView contentContainerStyle={s.screenContent}>
  <Header title={t('adhanTitle')} t={t} rtl={rtl} onBack={onBack}/>
  <Text style={[s.screenHint,textDir(rtl)]}>{t('adhanHint')}</Text>
  {adhan.catalog.map(item=>{
   const selected=adhan.selectedId===item.id,playing=adhan.playingId===item.id;
   return <Pressable key={item.id} onPress={()=>adhan.select(item.id)} style={[s.adhanCard,selected&&s.selectedGold]}>
    <View style={[s.adhanRow,rowDir(rtl)]}>
     <Pressable onPress={()=>playing?adhan.stop():adhan.preview(item.id)} style={s.playCircle}><Text style={s.playCircleText}>{playing?'Ⅱ':'▶'}</Text></Pressable>
     <View style={s.adhanTextWrap}><Text style={[s.adhanName,textDir(rtl)]}>{rtl?item.display_ar:item.display_en}</Text><Text style={[s.adhanMeta,textDir(rtl)]}>{item.license} • {t('licensed')}</Text></View>
     <View style={[s.radio,selected&&s.radioSelected]}>{selected&&<Text style={s.radioCheck}>✓</Text>}</View>
    </View>
   </Pressable>
  })}
  <View style={s.previewBox}><View style={[s.panelHeading,rowDir(rtl)]}><Text style={s.panelTitle}>{t('previewSound')}</Text><Text style={s.wave}>▂▅▃▇▆▂▅▃▂▁</Text></View><Text style={[s.adhanMeta,textDir(rtl)]}>{adhan.selected?(rtl?adhan.selected.display_ar:adhan.selected.display_en):t('notAvailable')}</Text></View>
  <View style={s.volumeBox}>
   <View style={[s.volumeHeader,rowDir(rtl)]}><Text style={[s.volumeTitle,textDir(rtl)]}>{t('adhanVolume')}</Text><Text style={s.volumePercent}>{Math.round(adhan.volume*100)}%</Text></View>
   <View style={s.volumeControls}>
    <Pressable accessibilityLabel='Decrease Adhan volume' onPress={()=>adhan.setVolume(Math.max(0,Math.round((adhan.volume-0.1)*10)/10))} style={s.volumeButton}><Text style={s.volumeButtonText}>−</Text></Pressable>
    <View style={s.volumeSegments}>{Array.from({length:10},(_,i)=>(i+1)/10).map(level=><Pressable accessibilityLabel={`Adhan volume ${Math.round(level*100)} percent`} key={level} onPress={()=>adhan.setVolume(level)} style={[s.volumeSegment,adhan.volume+0.001>=level&&s.volumeSegmentActive]}/>)}</View>
    <Pressable accessibilityLabel='Increase Adhan volume' onPress={()=>adhan.setVolume(Math.min(1,Math.round((adhan.volume+0.1)*10)/10))} style={s.volumeButton}><Text style={s.volumeButtonText}>+</Text></Pressable>
   </View>
  </View>
  {!!adhan.error&&<Text style={[s.errorText,textDir(rtl)]}>{t('audioError')}</Text>}
 </ScrollView></SafeAreaView>
}

const GROUP_ORDER=['seasons','atmospheres','weekdays','months','special'];
function ThemesScreen({t,rtl,isPlus,selectedTheme,setSelectedTheme,onBack}){
 const [group,setGroup]=useState('seasons');
 const themes=THEME_CATALOG.filter(x=>x.group===group&&(isPlus||!x.plus));
 return <SafeAreaView style={s.flatSafe}><ScrollView contentContainerStyle={s.screenContent}>
  <Header title={t('themes')} t={t} rtl={rtl} onBack={onBack}/><Text style={[s.screenHint,textDir(rtl)]}>{t('themesHint')}</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>{GROUP_ORDER.map(g=><Pressable key={g} onPress={()=>setGroup(g)} style={[s.tabPill,group===g&&s.tabPillActive]}><Text style={[s.tabPillText,group===g&&{color:GOLD}]}>{t(g)}</Text></Pressable>)}</ScrollView>
  {!isPlus&&<View style={s.plusGate}><Text style={[s.note,textDir(rtl)]}>{t('plusOnly')}</Text></View>}
  <View style={s.themeGrid}>{themes.map(item=><Pressable key={item.id} onPress={()=>setSelectedTheme(item.id)} style={[s.themeCard,selectedTheme===item.id&&s.selectedGold]}><Image source={item.image} style={s.themeImage}/><View style={s.themeCaption}><Text style={s.themeCaptionText}>{t(item.labelKey)}</Text></View></Pressable>)}</View>
  {isPlus&&<Pressable onPress={()=>setSelectedTheme('auto')} style={[s.autoThemeButton,selectedTheme==='auto'&&s.selectedGold]}><Text style={s.autoThemeButtonText}>↻ {t('automatic')}</Text></Pressable>}
 </ScrollView></SafeAreaView>
}

function PlusScreen({t,rtl,isPlus,onBack}){
 const free=[t('freePrayer'),t('freeCalendars'),t('freeThemes'),t('freeCore')];
 const plus=[t('plusAllFree'),t('plusThemes'),t('plusAdhan'),t('plusSeasons'),t('plusSupport')];
 return <SafeAreaView style={s.flatSafe}><ScrollView contentContainerStyle={s.screenContent}>
  <Header title={t('chooseExperience')} t={t} rtl={rtl} onBack={onBack}/>
  <View style={[s.planCards,rowDir(rtl)]}>
   <View style={s.freePlan}><Text style={s.planTitle}>{t('free')}</Text><Text style={s.planSubtitle}>{t('allEssentials')}</Text>{free.map(x=><CheckRow key={x} text={x} rtl={rtl}/>) }<View style={s.currentPlanButton}><Text style={s.currentPlanText}>{!isPlus?t('currentPlan'):t('free')}</Text></View></View>
   <View style={s.plusPlan}><Text style={s.crown}>♛</Text><Text style={[s.planTitle,{color:GOLD}]}>{t('plus')}</Text><Text style={s.planSubtitle}>{t('plusExperience')}</Text>{plus.map(x=><CheckRow key={x} text={x} rtl={rtl} gold/>)}<Pressable style={s.subscribeButton}><Text style={s.subscribeText}>{isPlus?t('currentPlan'):t('subscribeNow')} ›</Text></Pressable></View>
  </View>
 </ScrollView></SafeAreaView>
}

function LanguageScreen({t,rtl,language,onChoose,onBack}){
 return <SafeAreaView style={s.flatSafe}><ScrollView contentContainerStyle={s.screenContent}>
  <Header title={t('languageTitle')} t={t} rtl={rtl} onBack={onBack}/><Text style={[s.screenHint,textDir(rtl)]}>{t('languageHint')}</Text>
  {LOCALES.map(([id,label,tag,dir])=><Pressable key={id} onPress={()=>onChoose(id)} style={[s.languageRow,rowDir(rtl),language===id&&s.selectedGold]}><View><Text style={[s.languageName,textDir(dir==='rtl')]}>{label}</Text><Text style={[s.languageCode,textDir(dir==='rtl')]}>{tag}</Text></View><Text style={s.languageSelected}>{language===id?'✓':''}</Text></Pressable>)}
 </ScrollView></SafeAreaView>
}

function AboutScreen({t,rtl,onBack}){
 return <SafeAreaView style={s.flatSafe}><ScrollView contentContainerStyle={s.screenContent}>
  <Header title={t('aboutTitle')} t={t} rtl={rtl} onBack={onBack}/>
  <View style={s.aboutLogo}><Text style={s.aboutLogoMark}>◩</Text><Text style={s.aboutLogoName}>{t('appName')}</Text><Text style={s.aboutLogoTag}>{t('tagline')}</Text></View>
  <View style={s.disclaimer}><Text style={[s.disclaimerText,textDir(rtl)]}>{t('researchDisclaimer')}</Text></View>
  <SectionCard title={t('research')} rtl={rtl}><Text style={[s.bodyText,textDir(rtl)]}>{t('researchBody')}</Text></SectionCard>
  <Text style={s.versionText}>v{VERSION}</Text>
 </ScrollView></SafeAreaView>
}

function SettingsScreen({t,rtl,adhan,onNavigate,location,onBack}){
 return <SafeAreaView style={s.flatSafe}><ScrollView contentContainerStyle={s.screenContent}>
  <Header title={t('settings')} t={t} rtl={rtl} onBack={onBack}/>
  <View style={s.settingCard}><View style={[s.settingRow,rowDir(rtl)]}><View><Text style={[s.settingTitle,textDir(rtl)]}>{t('notifications')}</Text><Text style={[s.settingHint,textDir(rtl)]}>{t('adhanTitle')}</Text></View><Switch value={adhan.alertsEnabled} onValueChange={adhan.setPrayerAlerts} trackColor={{false:'#38495B',true:'#A87B28'}} thumbColor={adhan.alertsEnabled?GOLD:'#E8EDF2'}/></View></View>
  {[[t('adhanTitle'),'adhan','♪'],[t('themes'),'themes','▧'],[t('languages'),'languages','◎'],[t('location'),'cities','⌖'],[t('about'),'about','ⓘ'],[t('privacy'),'privacy','◇']].map(([label,target,icon])=><Pressable key={target} onPress={()=>onNavigate(target)} style={[s.settingLink,rowDir(rtl)]}><Text style={s.settingIcon}>{icon}</Text><Text style={[s.settingLinkText,textDir(rtl)]}>{label}</Text><Text style={s.settingChevron}>›</Text></Pressable>)}
  <View style={s.settingCard}><Text style={[s.settingTitle,textDir(rtl)]}>{t('location')}</Text><Text style={[s.settingHint,textDir(rtl)]}>{location.label}</Text></View>
 </ScrollView></SafeAreaView>
}

function CitiesScreen({t,rtl,location,onBack}){
 return <SafeAreaView style={s.flatSafe}><ScrollView contentContainerStyle={s.screenContent}>
  <Header title={t('manualCity')} t={t} rtl={rtl} onBack={onBack}/>
  <Pressable onPress={location.refresh} style={s.primaryButton}><Text style={s.primaryButtonText}>⌖ {t('gps')}</Text></Pressable>
  {location.cities.map(city=><Pressable key={city.id} onPress={()=>location.setManualCity(city)} style={[s.cityRow,rowDir(rtl)]}><Text style={[s.cityName,textDir(rtl)]}>{rtl?city.name_ar:city.name_en}</Text><Text style={s.cityCountry}>{city.country}</Text></Pressable>)}
 </ScrollView></SafeAreaView>
}

export default function AppV3(){
 const [language,setLanguage]=useState('ar');
 const [screen,setScreen]=useState('home');
 const [screenHistory,setScreenHistory]=useState([]);
 const [drawer,setDrawer]=useState(false);
 const [now,setNow]=useState(new Date());
 const [selectedTheme,setSelectedThemeState]=useState(IS_PLUS?'auto':'trial-fixed');
 const [hijriDate,setHijriDate]=useState(new Date());
 const [gregDate,setGregDate]=useState(new Date());
 const rtl=v3IsRtl(language),locale=v3LocaleTag(language),t=useMemo(()=>makeV3Translator(language),[language]);
 const location=useDeviceLocation({rtl});
 const adhan=useAdhanAudio();
 const trialAds=useTrialAd({enabled:!IS_PLUS,country:location.country,language});

 useEffect(()=>{AsyncStorage.getItem(LANGUAGE_KEY).then(x=>{if(x&&LOCALES.some(([id])=>id===x))setLanguage(x)}).catch(()=>{});AsyncStorage.getItem(THEME_KEY).then(x=>{if(x&&(x==='auto'||THEME_BY_ID[x]))setSelectedThemeState(x)}).catch(()=>{})},[]);
 useEffect(()=>{const id=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(screen!=='adhan')adhan.stop()},[screen]);

 const civilDate=useMemo(()=>civilDateForTimeZone(now,location.tz),[now,location.tz]);
 const tzOffset=useMemo(()=>timeZoneOffsetMinutes(now,location.tz),[now,location.tz]);
 const prayers=useMemo(()=>calculatePrayerTimes({date:civilDate,lat:location.lat,lon:location.lon,tzOffsetMin:tzOffset,method:'MWL',clockLanguage:rtl?'ar':'en'}),[civilDate,location.lat,location.lon,tzOffset,rtl]);
 const lunar=useMemo(()=>proposedLunisolarDate(civilDate),[civilDate]);
 const prayerDates=useMemo(()=>Object.fromEntries(['fajr','dhuhr','asr','maghrib','isha'].map(k=>[k,utcDateFromMinutes(civilDate,prayers.rawMinutesUtc[k])])),[civilDate,prayers]);
 const prayerNames=useMemo(()=>({fajr:t('fajr'),dhuhr:t('dhuhr'),asr:t('asr'),maghrib:t('maghrib'),isha:t('isha')}),[t]);
 useEffect(()=>{adhan.schedulePrayerAlerts({dates:prayerDates,names:prayerNames,language:locale})},[adhan.alertsEnabled,adhan.selectedId,civilDate.getTime(),location.lat,location.lon,language]);

 const setSelectedTheme=useCallback(async id=>{
  if(!IS_PLUS&&id!=='trial-fixed'){setScreenHistory(history=>[...history,'themes']);setScreen('plus');return}
  setSelectedThemeState(id);try{await AsyncStorage.setItem(THEME_KEY,id)}catch(e){}
 },[]);
 const chooseLanguage=useCallback(async id=>{setLanguage(id);try{await AsyncStorage.setItem(LANGUAGE_KEY,id)}catch(e){}},[]);
 const themeSource=useMemo(()=>{
  if(!IS_PLUS)return HOME_REFERENCE_BACKGROUND;
  if(selectedTheme==='auto')return THEME_BY_ID[automaticThemeId(now)]?.image||HOME_REFERENCE_BACKGROUND;
  return THEME_BY_ID[selectedTheme]?.image||HOME_REFERENCE_BACKGROUND;
 },[selectedTheme,now]);

 const checkUpdate=useCallback(async()=>{
  setDrawer(false);
  try{
   const res=await fetch(`${UPDATE_URL}?t=${Date.now()}`,{headers:{'Cache-Control':'no-cache'}});if(!res.ok)throw new Error('HTTP');
   const info=await res.json();
   if(!isNewer(info.version,VERSION)){Alert.alert(t('checkUpdate'),rtl?'أنت تستخدم أحدث نسخة.':'You are using the latest version.');return}
   Alert.alert(t('checkUpdate'),`${rtl?'يتوفر إصدار جديد':'A new version is available'}: ${info.version}`,[{text:t('close'),style:'cancel'},{text:rtl?'فتح التحديث':'Open update',onPress:()=>{const url=info.download_url||info.play_url||info.app_store_url;if(url)Linking.openURL(url)}}]);
  }catch(e){Alert.alert(t('checkUpdate'),rtl?'تعذر الاتصال بخدمة التحديث الآن. حاول مرة أخرى.':'Could not reach the update service. Please try again.')}
 },[t,rtl]);

 const navigate=useCallback(target=>{
  setDrawer(false);
  if(target==='support'){
   Alert.alert(t('support'),SUPPORT_ACCOUNT?(rtl?`رقم الدعم: ${SUPPORT_ACCOUNT}`:`Support account: ${SUPPORT_ACCOUNT}`):(rtl?'سيُضاف رقم الدعم المعتمد داخل الإصدار النهائي.':'The verified support account will be added in the final release.'));return;
  }
  if(target==='update'){checkUpdate();return}
  if(target===screen)return;
  setScreenHistory(history=>[...history,screen]);
  setScreen(target);
 },[t,rtl,checkUpdate,screen]);
 const goBack=useCallback(()=>{
  setDrawer(false);
  if(!screenHistory.length){setScreen('home');return}
  const previous=screenHistory[screenHistory.length-1];
  setScreenHistory(screenHistory.slice(0,-1));
  setScreen(previous);
 },[screenHistory]);
 const goHome=useCallback(()=>{setDrawer(false);setScreenHistory([]);setScreen('home')},[]);
 const refreshGps=async()=>{const result=await location.refresh();if(!result&&location.error){const msg=location.error==='PERMISSION_DENIED'?t('locationDenied'):location.error==='SERVICES_OFF'?(rtl?'خدمة GPS متوقفة. فعّل الموقع ثم حاول مرة أخرى.':'GPS is off. Turn on location and try again.'):t('locationUnavailable');Alert.alert(t('location'),msg)}};

 if(screen==='adhan')return <AdhanScreen t={t} rtl={rtl} adhan={adhan} onBack={goBack}/>;
 if(screen==='themes')return <ThemesScreen t={t} rtl={rtl} isPlus={IS_PLUS} selectedTheme={selectedTheme} setSelectedTheme={setSelectedTheme} onBack={goBack}/>;
 if(screen==='plus')return <PlusScreen t={t} rtl={rtl} isPlus={IS_PLUS} onBack={goBack}/>;
 if(screen==='languages')return <LanguageScreen t={t} rtl={rtl} language={language} onChoose={chooseLanguage} onBack={goBack}/>;
 if(screen==='about')return <AboutScreen t={t} rtl={rtl} onBack={goBack}/>;
 if(screen==='privacy')return <PrivacyScreen rtl={rtl} onBack={goBack} onNavigate={navigate}/>;
 if(screen==='copyright')return <CopyrightScreen rtl={rtl} onBack={goBack}/>;
 if(screen==='authenticity')return <AuthenticityScreen rtl={rtl} onBack={goBack} edition={IS_PLUS?'plus':'trial'} version={VERSION}/>;
 if(screen==='advertise')return <AdvertiseScreen rtl={rtl} language={language} country={location.country} onBack={goBack}/>;
 if(screen==='settings')return <SettingsScreen t={t} rtl={rtl} adhan={adhan} onNavigate={navigate} location={location} onBack={goBack}/>;
 if(screen==='cities')return <CitiesScreen t={t} rtl={rtl} location={location} onBack={goBack}/>;
 if(screen==='calendarHijri'||screen==='calendarGregorian')setTimeout(()=>setScreen('home'),0);

 return <View style={s.root}>
  <HomeScreen t={t} rtl={rtl} locale={locale} location={location} prayers={prayers} lunar={lunar} now={now} onMenu={()=>setDrawer(true)} onGps={refreshGps} onNavigate={navigate} themeSource={themeSource} hijriDate={hijriDate} setHijriDate={setHijriDate} gregDate={gregDate} setGregDate={setGregDate}/>
  {drawer&&<Drawer t={t} rtl={rtl} onClose={()=>setDrawer(false)} onNavigate={navigate} onUpdate={checkUpdate}/>} 
  {!IS_PLUS&&<TrialAdOverlay ad={trialAds.ad} rtl={rtl} onClose={trialAds.dismiss} onOpen={trialAds.open}/>} 
 </View>
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:NAVY},safe:{flex:1},flatSafe:{flex:1,backgroundColor:NAVY},homeBg:{flex:1,backgroundColor:NAVY},homeBgImage:{opacity:1},homeShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(2,12,24,0.33)'},homeContent:{paddingHorizontal:16,paddingBottom:42},
 heroTop:{minHeight:86,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',paddingTop:8},iconButton:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:'rgba(255,255,255,.18)'},iconButtonGold:{borderColor:GOLD_SOFT},iconButtonText:{fontSize:26,color:WHITE,fontWeight:'400'},locationWrap:{alignItems:'flex-end',maxWidth:'55%'},gpsPill:{paddingHorizontal:16,height:42,borderRadius:22,borderWidth:1.2,borderColor:GOLD,backgroundColor:'rgba(2,25,52,.64)',alignItems:'center',justifyContent:'center'},gpsText:{color:WHITE,fontSize:15,fontWeight:'700'},locationLabel:{color:WHITE,fontSize:13,fontWeight:'700',marginTop:7,maxWidth:190},accuracyText:{color:MUTED,fontSize:10,marginTop:2},
 dateHero:{alignItems:'center',paddingTop:4},hijriHero:{color:WHITE,fontSize:25,fontWeight:'700',textAlign:'center',textShadowColor:'rgba(0,0,0,.9)',textShadowRadius:7},gregHero:{color:'#E5E9EF',fontSize:15,marginTop:8,textAlign:'center',textShadowColor:'rgba(0,0,0,.8)',textShadowRadius:5},visualSpace:{height:245},quoteBlock:{alignItems:'center',marginBottom:14},quoteText:{color:WHITE,fontSize:23,fontWeight:'600',textAlign:'center',textShadowColor:'rgba(0,0,0,.9)',textShadowRadius:7},quoteSub:{color:WHITE,fontSize:14,marginTop:7,textShadowColor:'rgba(0,0,0,.9)',textShadowRadius:5},
 glassPanel:{backgroundColor:'rgba(7,23,41,.82)',borderColor:'rgba(244,196,93,.55)',borderWidth:1,borderRadius:18,padding:10,overflow:'hidden'},panelHeading:{alignItems:'center',justifyContent:'space-between',marginBottom:8},panelTitle:{fontSize:18,fontWeight:'800',color:GOLD},panelAction:{color:'#DCE3EC',fontSize:12},prayerStrip:{width:'100%',paddingVertical:1},prayerItem:{flex:1,minWidth:0,minHeight:72,alignItems:'center',justifyContent:'center',paddingHorizontal:1,borderRightWidth:StyleSheet.hairlineWidth,borderColor:LINE},prayerIcon:{color:WHITE,fontSize:17},prayerName:{color:WHITE,fontSize:10,fontWeight:'700',marginTop:3,textAlign:'center'},prayerTime:{color:'#F2F3F5',fontSize:10.5,fontWeight:'700',marginTop:2,textAlign:'center'},
 dualCards:{gap:10,marginTop:12},dateMiniCard:{flex:1,minHeight:152,backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:'rgba(255,255,255,.20)',padding:14},miniTitle:{color:WHITE,fontSize:15,fontWeight:'800'},miniSubtitle:{color:'#D2DBE5',fontSize:11,marginTop:7},miniDay:{color:WHITE,fontSize:43,fontWeight:'800',textAlign:'center',marginTop:10},miniWeek:{color:'#DDE5EE',fontSize:12,textAlign:'center'},
 sectionCard:{backgroundColor:'rgba(5,20,37,.90)',borderRadius:20,borderWidth:1,borderColor:'rgba(255,255,255,.13)',padding:15,marginTop:14},sectionTitleRow:{alignItems:'center',justifyContent:'space-between',marginBottom:12},sectionTitle:{color:GOLD,fontSize:19,fontWeight:'800',flex:1},calendarNav:{alignItems:'center',justifyContent:'space-between',marginBottom:12},calendarMonthTitle:{color:WHITE,fontSize:17,fontWeight:'800'},navSmall:{width:36,height:36,borderRadius:18,backgroundColor:CARD_2,alignItems:'center',justifyContent:'center'},navSmallText:{color:WHITE,fontSize:26},weekHeader:{flexDirection:'row'},weekHeaderText:{width:'14.2857%',textAlign:'center',color:MUTED,fontSize:10,fontWeight:'700'},calendarGrid:{flexDirection:'row',flexWrap:'wrap',marginTop:6},dayCell:{width:'14.2857%',height:42,alignItems:'center',justifyContent:'center'},dayText:{color:WHITE,fontSize:14},dayToday:{color:NAVY,backgroundColor:GOLD,borderRadius:16,overflow:'hidden',paddingHorizontal:9,paddingVertical:5,fontWeight:'900'},inlineLink:{alignSelf:'center',padding:8,marginTop:3},inlineLinkText:{color:GOLD,fontWeight:'700'},eventNotice:{marginTop:10,borderRadius:12,borderWidth:1,borderColor:GOLD_SOFT,backgroundColor:'rgba(244,196,93,.13)',paddingHorizontal:12,paddingVertical:9},eventNoticeText:{color:'#FFE7A6',fontSize:12,fontWeight:'700',lineHeight:19},note:{color:MUTED,fontSize:12,lineHeight:19,marginTop:8},
 drawerBackdrop:{...StyleSheet.absoluteFillObject,zIndex:20,backgroundColor:'rgba(0,0,0,.30)'},drawerDismiss:{...StyleSheet.absoluteFillObject},drawer:{position:'absolute',top:0,bottom:0,width:'83%',maxWidth:380,backgroundColor:'rgba(5,20,37,.98)',borderColor:'rgba(255,255,255,.12)',borderWidth:StyleSheet.hairlineWidth},drawerSafe:{flex:1,padding:22},drawerClose:{width:42,height:42,alignItems:'center',justifyContent:'center'},drawerCloseText:{color:WHITE,fontSize:34},drawerBrand:{alignItems:'center',marginTop:6,marginBottom:20},logoTile:{width:70,height:70,borderRadius:18,borderWidth:1.5,borderColor:GOLD,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(244,196,93,.10)'},logoTileText:{fontSize:34,color:GOLD},drawerAppName:{fontSize:28,color:GOLD,fontWeight:'900',marginTop:10},drawerTagline:{fontSize:13,color:GOLD_SOFT,marginTop:2},drawerLine:{height:1,backgroundColor:LINE,marginBottom:3},drawerItem:{height:58,alignItems:'center',gap:16,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:LINE},drawerItemIcon:{width:28,textAlign:'center',color:WHITE,fontSize:22},drawerItemText:{flex:1,color:WHITE,fontSize:17,fontWeight:'600'},drawerBottom:{marginTop:'auto',paddingTop:25},drawerSlogan:{color:GOLD,fontSize:20,lineHeight:31,fontWeight:'600'},
 screenContent:{padding:18,paddingBottom:45},screenHeader:{height:60,alignItems:'center',justifyContent:'space-between'},screenTitle:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},headerSpacer:{width:44},screenHint:{color:MUTED,fontSize:14,lineHeight:21,marginVertical:8},
 adhanCard:{backgroundColor:CARD_2,borderWidth:1,borderColor:LINE,borderRadius:17,padding:11,marginTop:10},selectedGold:{borderColor:GOLD,borderWidth:1.5,shadowColor:GOLD,shadowOpacity:.35,shadowRadius:7,elevation:3},adhanRow:{alignItems:'center',gap:12},playCircle:{width:49,height:49,borderRadius:25,borderWidth:1.5,borderColor:WHITE,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,.25)'},playCircleText:{color:WHITE,fontSize:18},adhanTextWrap:{flex:1},adhanName:{color:WHITE,fontSize:16,fontWeight:'800'},adhanMeta:{color:MUTED,fontSize:11,marginTop:5,lineHeight:16},radio:{width:26,height:26,borderRadius:13,borderWidth:2,borderColor:'#8B95A0',alignItems:'center',justifyContent:'center'},radioSelected:{backgroundColor:GOLD,borderColor:GOLD},radioCheck:{color:NAVY,fontWeight:'900'},previewBox:{marginTop:18,padding:16,borderRadius:18,backgroundColor:CARD_2,borderWidth:1,borderColor:LINE},wave:{color:MUTED,fontSize:21,letterSpacing:2},volumeBox:{marginTop:12,padding:14,borderRadius:18,backgroundColor:CARD_2,borderWidth:1,borderColor:LINE},volumeHeader:{alignItems:'center',justifyContent:'space-between',marginBottom:12},volumeTitle:{color:WHITE,fontSize:14,fontWeight:'800',flex:1},volumePercent:{color:GOLD,fontSize:14,fontWeight:'900'},volumeControls:{flexDirection:'row',alignItems:'center',gap:9},volumeButton:{width:40,height:40,borderRadius:13,borderWidth:1,borderColor:GOLD_SOFT,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(244,196,93,.09)'},volumeButtonText:{color:GOLD,fontSize:24,fontWeight:'800'},volumeSegments:{flex:1,height:34,flexDirection:'row',alignItems:'center',gap:4},volumeSegment:{flex:1,height:10,borderRadius:5,backgroundColor:'rgba(255,255,255,.16)'},volumeSegmentActive:{backgroundColor:GOLD},errorText:{color:'#FFB4B4',marginTop:10,fontSize:12},
 tabRow:{gap:8,paddingVertical:9},tabPill:{paddingHorizontal:17,height:42,borderRadius:15,borderWidth:1,borderColor:LINE,justifyContent:'center',backgroundColor:CARD_2},tabPillActive:{borderColor:GOLD,shadowColor:GOLD,shadowOpacity:.25,shadowRadius:6},tabPillText:{color:WHITE,fontSize:13,fontWeight:'700'},plusGate:{padding:10},themeGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:8},themeCard:{width:'48%',height:205,borderRadius:18,overflow:'hidden',borderWidth:1,borderColor:LINE,backgroundColor:CARD},themeImage:{width:'100%',height:'100%',resizeMode:'cover'},themeCaption:{position:'absolute',left:0,right:0,bottom:0,padding:10,backgroundColor:'rgba(0,0,0,.55)'},themeCaptionText:{color:WHITE,fontSize:14,fontWeight:'800',textAlign:'center'},autoThemeButton:{height:52,borderRadius:16,backgroundColor:CARD_2,borderWidth:1,borderColor:LINE,alignItems:'center',justifyContent:'center',marginTop:14},autoThemeButtonText:{color:GOLD,fontSize:16,fontWeight:'800'},
 planCards:{gap:10,alignItems:'stretch',marginTop:12},freePlan:{flex:1,borderRadius:22,padding:16,backgroundColor:'rgba(24,43,63,.85)',borderWidth:1,borderColor:'rgba(255,255,255,.26)'},plusPlan:{flex:1,borderRadius:22,padding:16,backgroundColor:'rgba(52,38,16,.86)',borderWidth:1.7,borderColor:GOLD},planTitle:{color:WHITE,fontSize:24,fontWeight:'900',textAlign:'center'},planSubtitle:{color:'#D8DEE6',fontSize:13,textAlign:'center',marginTop:5,marginBottom:14},crown:{fontSize:30,color:GOLD,textAlign:'center'},checkRow:{alignItems:'center',gap:9,marginVertical:7},checkDot:{width:23,height:23,borderRadius:12,backgroundColor:'#5C6D7F',alignItems:'center',justifyContent:'center'},checkDotGold:{backgroundColor:GOLD},checkMark:{color:NAVY,fontWeight:'900'},checkText:{flex:1,color:WHITE,fontSize:12,lineHeight:18},currentPlanButton:{height:44,borderRadius:20,backgroundColor:'#667384',alignItems:'center',justifyContent:'center',marginTop:13},currentPlanText:{color:WHITE,fontWeight:'700'},subscribeButton:{height:48,borderRadius:20,backgroundColor:GOLD,alignItems:'center',justifyContent:'center',marginTop:13},subscribeText:{color:'#2E210B',fontWeight:'900',fontSize:15},
 languageRow:{minHeight:64,borderRadius:15,backgroundColor:CARD_2,borderWidth:1,borderColor:LINE,marginTop:8,paddingHorizontal:14,alignItems:'center',justifyContent:'space-between'},languageName:{color:WHITE,fontSize:15,fontWeight:'800'},languageCode:{color:MUTED,fontSize:11,marginTop:3},languageSelected:{color:GOLD,fontSize:21,fontWeight:'900'},
 aboutLogo:{alignItems:'center',paddingVertical:26},aboutLogoMark:{color:GOLD,fontSize:54},aboutLogoName:{color:GOLD,fontSize:31,fontWeight:'900'},aboutLogoTag:{color:MUTED,fontSize:13,marginTop:4},disclaimer:{backgroundColor:'rgba(244,196,93,.10)',borderRadius:17,borderWidth:1,borderColor:GOLD_SOFT,padding:15,marginBottom:8},disclaimerText:{color:'#FFE8B2',fontSize:14,fontWeight:'700',lineHeight:22},bodyText:{color:'#E2E8EF',fontSize:14,lineHeight:24},versionText:{textAlign:'center',color:'#8290A0',fontSize:11,marginTop:20},
 settingCard:{backgroundColor:CARD_2,borderWidth:1,borderColor:LINE,borderRadius:17,padding:15,marginTop:10},settingRow:{alignItems:'center',justifyContent:'space-between'},settingTitle:{color:WHITE,fontSize:16,fontWeight:'800'},settingHint:{color:MUTED,fontSize:12,marginTop:5,maxWidth:260},settingLink:{height:62,borderRadius:16,backgroundColor:CARD_2,borderWidth:1,borderColor:LINE,paddingHorizontal:14,alignItems:'center',gap:12,marginTop:8},settingIcon:{color:GOLD,fontSize:21,width:28,textAlign:'center'},settingLinkText:{color:WHITE,fontSize:15,fontWeight:'700',flex:1},settingChevron:{color:MUTED,fontSize:24},primaryButton:{height:52,borderRadius:17,backgroundColor:GOLD,alignItems:'center',justifyContent:'center',marginVertical:10},primaryButtonText:{color:NAVY,fontSize:16,fontWeight:'900'},cityRow:{height:56,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:LINE,alignItems:'center',justifyContent:'space-between',paddingHorizontal:8},cityName:{color:WHITE,fontSize:14,fontWeight:'700'},cityCountry:{color:MUTED,fontSize:11}
});
