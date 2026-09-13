from pathlib import Path

ROOT=Path('.')

# --- Harden activation: no implicit deep-link bypass when license service is absent.
p=ROOT/'src/services/license.js'
text=p.read_text(encoding='utf-8')
old="if(!LICENSE_API_URL)return ENFORCEMENT_REQUIRED?{valid:false,reason:'license_service_not_configured'}:{valid:true,tier:appVariant==='paid'?'plus':'trial',developmentBypass:true};"
new="if(!LICENSE_API_URL){if(EXPLICIT_DEV_BYPASS&&!ENFORCEMENT_REQUIRED)return {valid:true,tier:appVariant==='paid'?'plus':'trial',developmentBypass:true};return {valid:false,reason:'license_service_not_configured'};}"
if old not in text: raise RuntimeError('activation bypass source fragment not found')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# --- Schedule prayer and Ramadan alerts ahead instead of only for the current day.
p=ROOT/'App.js'
app=p.read_text(encoding='utf-8')
start=" useEffect(()=>{\n  let active=true;\n  async function setupPrayerNotifications(){"
end=" },[adhanEnabled,dayKey,prayerData,prayerCalcDate,selectedAdhan?.id]);"
a=app.find(start)
b=app.find(end,a)
if a<0 or b<0: raise RuntimeError('prayer notification effect not found')
b+=len(end)
prayer=""" useEffect(()=>{
  let active=true;
  async function setupPrayerNotifications(){
   try{
    const soundFile=ADHAN_NOTIFICATION_SOUNDS[selectedAdhan?.id]||'beautiful_adhan.wav';
    const channelId=`prayers-adhan-${String(selectedAdhan?.id||'default').replace(/[^a-z0-9-]/gi,'-')}`;
    if(Platform.OS==='android'){
     await Notifications.setNotificationChannelAsync(channelId,{
      name:useArabicUi?`الأذان — ${selectedAdhan?.display_ar||'الصوت المختار'}`:`Adhan — ${selectedAdhan?.performer||'selected sound'}`,
      description:ui('تشغيل صوت الأذان تلقائيًا عند دخول وقت الصلاة','Play the selected Adhan automatically at prayer time'),
      importance:Notifications.AndroidImportance.MAX,
      vibrationPattern:[0,250,200,250],
      sound:soundFile,
      audioAttributes:{contentType:Notifications.AndroidAudioContentType.SONIFICATION,usage:Notifications.AndroidAudioUsage.NOTIFICATION}
     });
    }
    const scheduled=await Notifications.getAllScheduledNotificationsAsync();
    for(const item of scheduled){if(item.content?.data?.kind==='alofq-prayer')await Notifications.cancelScheduledNotificationAsync(item.identifier)}
    if(!adhanEnabled||!selectedAdhan||!active)return;
    const permission=await Notifications.getPermissionsAsync();
    if(permission.status!=='granted')return;
    const prayerNames=useArabicUi?{fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'}:{fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'};
    // Keep iOS comfortably below its pending-local-notification limit; Android can hold a longer rolling window.
    const horizonDays=Platform.OS==='ios'?7:14;
    const firstCivilDate=civilDateForTimeZone(now,city?.tz);
    for(let offset=0;offset<horizonDays&&active;offset++){
     const calcDate=new Date(firstCivilDate);calcDate.setUTCDate(calcDate.getUTCDate()+offset);
     const offsetMinutes=timeZoneOffsetMinutes(calcDate,city?.tz);
     const dayPrayerData=calculatePrayerTimes({date:calcDate,lat:coords.lat,lon:coords.lon,tzOffsetMin:offsetMinutes,method:'MWL',asrFactor:1,clockLanguage:useArabicUi?'ar':'en'});
     for(const [key,title] of Object.entries(prayerNames)){
      const date=utcDateFromMinutes(calcDate,dayPrayerData.rawMinutesUtc[key]);
      if(!date||date.getTime()<=Date.now())continue;
      await Notifications.scheduleNotificationAsync({
       content:{title:useArabicUi?`حان وقت صلاة ${title}`:`It is time for ${title}`,body:useArabicUi?`يُرفع الآن الأذان بصوت ${selectedAdhan.display_ar}.`:`Adhan is now playing with ${selectedAdhan.performer||'the selected sound'}.`,sound:soundFile,priority:Notifications.AndroidNotificationPriority.MAX,data:{kind:'alofq-prayer',prayer:key,adhanId:selectedAdhan.id,dayOffset:offset}},
       trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date,channelId:Platform.OS==='android'?channelId:undefined}
      });
     }
    }
   }catch(e){console.log('Prayer notifications error:',e)}
  }
  setupPrayerNotifications();
  return()=>{active=false};
 },[adhanEnabled,dayKey,coords.lat,coords.lon,city?.tz,selectedAdhan?.id,useArabicUi]);"""
app=app[:a]+prayer+app[b:]

start=" useEffect(()=>{\n   let active=true;\n\n   async function setupFastingNotifications(){"
end="]]\n );"
# Use the known dependency tail to avoid accidentally replacing another effect.
dep_tail=""" },[
   fastingData.rawMinutesUtc.imsak,
   fastingData.rawMinutesUtc.iftar,
   imsakAlertEnabled,
   iftarAlertEnabled,
   isRamadan,
   dayKey,
   prayerCalcDate
 ]);"""
a=app.find(start)
b=app.find(dep_tail,a)
if a<0 or b<0: raise RuntimeError('fasting notification effect not found')
b+=len(dep_tail)
fasting=""" useEffect(()=>{
   let active=true;
   async function setupFastingNotifications(){
    try{
     if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('fasting',{name:ui('تنبيهات الإمساك والإفطار','Imsak and Iftar alerts'),importance:Notifications.AndroidImportance.HIGH,vibrationPattern:[0,300,250,300]});
     const scheduled=await Notifications.getAllScheduledNotificationsAsync();
     for(const n of scheduled){if(n.content?.data?.kind==='alofq-imsak'||n.content?.data?.kind==='alofq-iftar')await Notifications.cancelScheduledNotificationAsync(n.identifier)}
     const permission=await Notifications.getPermissionsAsync();
     if(permission.status!=='granted'||!active||(!imsakAlertEnabled&&!iftarAlertEnabled))return;
     const horizonDays=Platform.OS==='ios'?7:14;
     const firstCivilDate=civilDateForTimeZone(now,city?.tz);
     for(let offset=0;offset<horizonDays&&active;offset++){
      const calcDate=new Date(firstCivilDate);calcDate.setUTCDate(calcDate.getUTCDate()+offset);
      if(proposedLunisolarDate(calcDate).month!==9)continue;
      const offsetMinutes=timeZoneOffsetMinutes(calcDate,city?.tz);
      const dayFasting=calculateFastingTimes({date:calcDate,lat:coords.lat,lon:coords.lon,tzOffsetMin:offsetMinutes,clockLanguage:useArabicUi?'ar':'en'});
      const imsakDate=utcDateFromMinutes(calcDate,dayFasting.rawMinutesUtc.imsak);
      const iftarDate=utcDateFromMinutes(calcDate,dayFasting.rawMinutesUtc.iftar);
      if(imsakAlertEnabled&&imsakDate&&imsakDate.getTime()>Date.now())await Notifications.scheduleNotificationAsync({content:{title:ui('موعد الإمساك','Imsak time'),body:ui('حان الآن موعد الإمساك بحسب المعيار الفلكي المعتمد في الأفق.','It is now Imsak time according to AlofoK’s astronomical research criterion.'),sound:'default',data:{kind:'alofq-imsak',dayOffset:offset}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:imsakDate,channelId:Platform.OS==='android'?'fasting':undefined}});
      if(iftarAlertEnabled&&iftarDate&&iftarDate.getTime()>Date.now())await Notifications.scheduleNotificationAsync({content:{title:ui('موعد الإفطار','Iftar time'),body:useArabicUi?(RAMADAN_VERSE+' — سورة البقرة، الآية 187'):(RAMADAN_VERSE_EN+' — Al-Baqarah 2:187'),sound:'default',data:{kind:'alofq-iftar',dayOffset:offset}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:iftarDate,channelId:Platform.OS==='android'?'fasting':undefined}});
     }
    }catch(e){console.log('Fasting notifications error:',e)}
   }
   setupFastingNotifications();
   return()=>{active=false};
 },[imsakAlertEnabled,iftarAlertEnabled,dayKey,coords.lat,coords.lon,city?.tz,useArabicUi]);"""
app=app[:a]+fasting+app[b:]
p.write_text(app,encoding='utf-8')

# Strengthen release QA for the rolling notification horizon and deep-link license hardening.
p=ROOT/'scripts/release-qa.js'
qa=p.read_text(encoding='utf-8')
marker="assert(app.includes(\"clockLanguage:useArabicUi?'ar':'en'\"),'prayer time AM/PM language switch missing');\n"
extra="assert(app.includes(\"const horizonDays=Platform.OS==='ios'?7:14;\"),'prayer and fasting notifications must be pre-scheduled beyond the current day');\nconst licenseSource=read('src/services/license.js');\nassert(licenseSource.includes(\"return {valid:false,reason:'license_service_not_configured'}\"),'Plus must fail closed when the license service is absent');\n"
if extra not in qa:
    if marker not in qa: raise RuntimeError('release QA insertion marker missing')
    qa=qa.replace(marker,marker+extra,1)
p.write_text(qa,encoding='utf-8')

print('Round 2 audit repairs applied. No APK/AAB build performed.')
