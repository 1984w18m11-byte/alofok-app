from pathlib import Path
import json
import re

ROOT=Path('.')
VERSION='0.5.7'
VERSION_CODE=28


def write(path,text):
    Path(path).write_text(text,encoding='utf-8')

# --- App.js ---------------------------------------------------------------
p=ROOT/'App.js'
app=p.read_text(encoding='utf-8')
app=re.sub(r"const APP_VERSION='[^']+';",f"const APP_VERSION='{VERSION}';",app,count=1)

# Fix system-direction selection so English device language is not forced RTL.
old=""" const activeLocale=appLanguage==='system'?undefined:localeTag(appLanguage);
 const interfaceIsRtl=appLanguage==='system'?true:isRtlLocale(appLanguage);
 const t=makeTranslator(appLanguage);
 const systemLocale=Intl.DateTimeFormat().resolvedOptions().locale||'ar';"""
new=""" const activeLocale=appLanguage==='system'?undefined:localeTag(appLanguage);
 const systemLocale=Intl.DateTimeFormat().resolvedOptions().locale||'ar';
 const interfaceIsRtl=appLanguage==='system'?String(systemLocale).toLowerCase().startsWith('ar'):isRtlLocale(appLanguage);
 const t=makeTranslator(appLanguage);"""
if old in app:
    app=app.replace(old,new,1)

# More descriptive automatic theme label.
app=app.replace("['auto-time','تلقائي حسب وقت اليوم',null]","['auto-time','تلقائي متنوع حسب الوقت والأسبوع والشهر والفصل',null]",1)
app=app.replace("'auto-time':'Automatic by time of day'","'auto-time':'Automatic rotation by time, week, month and season'",1)

# Prayer/fasting clocks must change AM/PM language together with the UI.
app=app.replace("   asrFactor:1\n }),[coords.lat,coords.lon,prayerCalcDate,tzOffsetMin]);","   asrFactor:1,\n   clockLanguage:useArabicUi?'ar':'en'\n }),[coords.lat,coords.lon,prayerCalcDate,tzOffsetMin,useArabicUi]);",1)
app=app.replace("   tzOffsetMin\n }),[coords.lat,coords.lon,prayerCalcDate,tzOffsetMin]);","   tzOffsetMin,\n   clockLanguage:useArabicUi?'ar':'en'\n }),[coords.lat,coords.lon,prayerCalcDate,tzOffsetMin,useArabicUi]);",1)

# Carry bilingual event metadata to the renderer.
app=app.replace("const lunarEventsForDay=lunar=>religiousFor(lunar.month,lunar.day).map(e=>({type:'مناسبة دينية',name:e.ar,details:e.note_ar||''}));","const lunarEventsForDay=lunar=>religiousFor(lunar.month,lunar.day).map(e=>({type:'مناسبة دينية',name:e.ar,name_en:e.en||'',details:e.note_ar||'',details_en:e.note_en||''}));",1)
app=app.replace("const gregorianEventsForDay=(country,date)=>nationalFor(country,date).map(e=>({type:'مناسبة وطنية',name:e.name_ar,details:e.note_ar||''}));","const gregorianEventsForDay=(country,date)=>nationalFor(country,date).map(e=>({type:'مناسبة وطنية',name:e.name_ar,name_en:e.name_en||'',details:e.note_ar||'',details_en:e.note_en||''}));",1)

# The same crescent/vector overlay was visually masking different Plus themes.
app=app.replace("  <View pointerEvents='none' style={[s.themeSky,{backgroundColor:theme.sky}]}><Text style={[s.themeSymbol,{color:theme.accent}]}>{theme.symbol}</Text><View style={[s.themeOrb,{borderColor:theme.accent}]}/></View>","  {!IS_PLUS&&<View pointerEvents='none' style={[s.themeSky,{backgroundColor:theme.sky}]}><Text style={[s.themeSymbol,{color:theme.accent}]}>{theme.symbol}</Text><View style={[s.themeOrb,{borderColor:theme.accent}]}/></View>}",1)
app=app.replace("opacity:IS_PLUS?.2:.76","opacity:IS_PLUS?.12:.76",1)

# Automatic Plus rotation: every week gets a different category and lunar month
# and season naturally change through the year. Special-event themes stay manual.
old_auto=""" const autoHour=now.getHours();
 const autoAtlasIndex=autoHour>=5&&autoHour<8?0:autoHour<11?1:autoHour<16?2:autoHour<18?3:autoHour<20?4:autoHour<23?5:6;
 const atlasIndex=selectedTheme==='auto-time'?autoAtlasIndex:(THEME_CHOICES.find(([id])=>id===selectedTheme)?.[2]??6);"""
new_auto=""" const autoHour=now.getHours();
 const timeAtlasIndex=autoHour>=5&&autoHour<8?0:autoHour<11?1:autoHour<16?2:autoHour<18?3:autoHour<20?4:autoHour<23?5:6;
 const lunarThemeIndex=7+Math.max(0,Math.min(11,(lunar.month||1)-1));
 const gregorianMonth=now.getMonth();
 const seasonAtlasIndex=(gregorianMonth===2||gregorianMonth===3||gregorianMonth===4)?19:(gregorianMonth===5||gregorianMonth===6||gregorianMonth===7)?20:(gregorianMonth===8||gregorianMonth===9||gregorianMonth===10)?21:22;
 const weekInLunarMonth=Math.min(4,Math.floor(((lunar.day||1)-1)/7));
 const autoAtlasIndex=weekInLunarMonth===0?timeAtlasIndex:weekInLunarMonth===1?lunarThemeIndex:weekInLunarMonth===2?seasonAtlasIndex:weekInLunarMonth===3?timeAtlasIndex:(((lunar.day||1)%2===0)?lunarThemeIndex:seasonAtlasIndex);
 const atlasIndex=selectedTheme==='auto-time'?autoAtlasIndex:(THEME_CHOICES.find(([id])=>id===selectedTheme)?.[2]??6);"""
if old_auto in app:
    app=app.replace(old_auto,new_auto,1)

# Recommended WAV notification sounds; preview playback remains OGG.
app=app.replace("'commons-beautiful-adhan':'beautiful_adhan.ogg'","'commons-beautiful-adhan':'beautiful_adhan.wav'",1)
app=app.replace("'commons-morocco-hassan-ii':'adhan_morocco_hassan_ii.ogg'","'commons-morocco-hassan-ii':'adhan_morocco_hassan_ii.wav'",1)
app=app.replace("'commons-kazakhstan-shalqar':'adhan_kazakhstan_shalqar.ogg'","'commons-kazakhstan-shalqar':'adhan_kazakhstan_shalqar.wav'",1)
app=app.replace("'commons-aaqib-azeez':'adhan_aaqib_azeez.ogg'","'commons-aaqib-azeez':'adhan_aaqib_azeez.wav'",1)
app=app.replace("const soundFile=ADHAN_NOTIFICATION_SOUNDS[selectedAdhan?.id]||'beautiful_adhan.ogg';","const soundFile=ADHAN_NOTIFICATION_SOUNDS[selectedAdhan?.id]||'beautiful_adhan.wav';",1)

# Do not show a previously saved Arabic location string after switching to English.
old_loc="{locationBusy?ui('جاري التحديد…','Locating…'):(locState==='بغداد • افتراضي'?ui('بغداد • افتراضي','Baghdad • default'):locState)}"
new_loc="{locationBusy?ui('جاري التحديد…','Locating…'):(locState==='بغداد • افتراضي'?ui('بغداد • افتراضي','Baghdad • default'):(!useArabicUi&&/[\\u0600-\\u06FF]/.test(locState)?(city?.name_en||'Current location'):locState))}"
app=app.replace(old_loc,new_loc,1)

# Event details should never fall back to Arabic in English mode.
old_event="function EventDetails({title,events,useArabicUi=true}){return <View style={s.eventList}><Text style={s.eventTitle}>{title}</Text>{events.length?events.map((e,i)=><View key={`${e.type}-${e.name}-${i}`} style={s.eventItem}><Text style={s.eventName}>● {e.name}</Text><Text style={s.eventType}>{useArabicUi?e.type:(e.type==='مناسبة دينية'?'Religious event':e.type==='مناسبة وطنية'?'National event':e.type)}</Text>{Boolean(e.details)&&<Text style={s.sub}>{e.details}</Text>}</View>):<Text style={s.noEvent}>{useArabicUi?'لا توجد مناسبة مسجلة في هذا اليوم.':'No event is recorded for this day.'}</Text>}</View>}"
new_event="function EventDetails({title,events,useArabicUi=true}){return <View style={s.eventList}><Text style={s.eventTitle}>{title}</Text>{events.length?events.map((e,i)=><View key={`${e.type}-${e.name}-${i}`} style={s.eventItem}><Text style={s.eventName}>● {useArabicUi?e.name:(e.name_en||(e.type==='مناسبة دينية'?'Religious event':'National event'))}</Text><Text style={s.eventType}>{useArabicUi?e.type:(e.type==='مناسبة دينية'?'Religious event':e.type==='مناسبة وطنية'?'National event':e.type)}</Text>{Boolean(useArabicUi?e.details:e.details_en)&&<Text style={s.sub}>{useArabicUi?e.details:e.details_en}</Text>}</View>):<Text style={s.noEvent}>{useArabicUi?'لا توجد مناسبة مسجلة في هذا اليوم.':'No event is recorded for this day.'}</Text>}</View>}"
if old_event in app:
    app=app.replace(old_event,new_event,1)

write(p,app)

# --- prayer engine --------------------------------------------------------
p=ROOT/'src/engine/prayer.js'
text=p.read_text(encoding='utf-8')
text=text.replace("function fmtMinutes(min,tzOffsetMin){","function fmtMinutes(min,tzOffsetMin,clockLanguage='ar'){")
text=text.replace('  const ap=h24<12?"ص":"م";','  const ap=clockLanguage===\'ar\'?(h24<12?"ص":"م"):(h24<12?"AM":"PM");')
text=text.replace('export function calculatePrayerTimes({date,lat,lon,tzOffsetMin,method="MWL",asrFactor=1}){','export function calculatePrayerTimes({date,lat,lon,tzOffsetMin,method="MWL",asrFactor=1,clockLanguage="ar"}){')
text=text.replace('fmtMinutes(v,tzOffsetMin)]','fmtMinutes(v,tzOffsetMin,clockLanguage)]')
text=text.replace('export function calculateFastingTimes({date,lat,lon,tzOffsetMin}){','export function calculateFastingTimes({date,lat,lon,tzOffsetMin,clockLanguage="ar"}){')
text=text.replace('fmtMinutes(raw.imsak,tzOffsetMin),','fmtMinutes(raw.imsak,tzOffsetMin,clockLanguage),')
text=text.replace('fmtMinutes(raw.iftar,tzOffsetMin)','fmtMinutes(raw.iftar,tzOffsetMin,clockLanguage)')
write(p,text)

# --- app.config.js: collapse accidental repeated declaration --------------
p=ROOT/'app.config.js'
text=p.read_text(encoding='utf-8')
text=re.sub(r"(?:  const packageId = isPaid \? 'com\.alofok\.plus' : 'com\.alofok\.trial';\n)+","  const packageId = isPaid ? 'com.alofok.plus' : 'com.alofok.trial';\n",text)
write(p,text)

# --- version + notification sound config ---------------------------------
p=ROOT/'app.json'
data=json.loads(p.read_text(encoding='utf-8'))
data['expo']['version']=VERSION
data['expo']['android']['versionCode']=VERSION_CODE
for plugin in data['expo'].get('plugins',[]):
    if isinstance(plugin,list) and plugin and plugin[0]=='expo-notifications':
        plugin[1]['sounds']=[
            './assets/adhan/beautiful_adhan.wav',
            './assets/adhan/adhan_morocco_hassan_ii.wav',
            './assets/adhan/adhan_kazakhstan_shalqar.wav',
            './assets/adhan/adhan_aaqib_azeez.wav'
        ]
write(p,json.dumps(data,ensure_ascii=False,indent=2)+'\n')

for fn in ['package.json','package-lock.json']:
    p=ROOT/fn
    data=json.loads(p.read_text(encoding='utf-8'))
    data['version']=VERSION
    if fn=='package-lock.json' and '' in data.get('packages',{}):
        data['packages']['']['version']=VERSION
    if fn=='package.json':
        data.setdefault('scripts',{})['check:release']='node scripts/release-qa.js'
    write(p,json.dumps(data,ensure_ascii=False,indent=2)+'\n')

# --- bilingual events -----------------------------------------------------
religious_en={
'muharram1':('First of Muharram',''),
'ashura':('Ashura — remembrance of the martyrdom of Imam Husayn',''),
'arbaeen':('Arbaeen — forty-day remembrance of Imam Husayn',''),
'ramadan1':('First of Ramadan',''),
'ali_martyrdom':('Remembrance of the martyrdom of Imam Ali ibn Abi Talib','Observed on 21 Ramadan; the injury is traditionally dated to 19 Ramadan.'),
'qadr':('Possible Laylat al-Qadr — night of 27 Ramadan','Laylat al-Qadr is sought in the last ten nights; the app highlights the 27th as one of the widely observed possibilities.'),
'eidfitr':('Eid al-Fitr',''),
'arafah':('Day of Arafah',''),
'eidadha':('Eid al-Adha',''),
'ali_birth':('Birth anniversary of Imam Ali','A commonly cited date in a number of Islamic sources is 13 Rajab.'),
'prophet_birth':('Birth anniversary of Prophet Muhammad','Two widely reported dates are 12 and 17 Rabi I.'),
'prophet_death':('Death anniversary of Prophet Muhammad','The app shows two commonly reported dates: 28 Safar and 12 Rabi I.'),
'fatima_death':('Death anniversary of Fatimah al-Zahra','Two widely reported dates are 13 Jumada I and 3 Jumada II.'),
'umar_death':('Remembrance of the death of Umar ibn al-Khattab','He was wounded on 26 Dhu al-Hijjah; some sources date his death to 1 Muharram.'),
'aisha_death':('Death anniversary of Aisha','Source review required.')
}
p=ROOT/'src/data/events.json'
events=json.loads(p.read_text(encoding='utf-8'))
for e in events:
    en,note=religious_en.get(e.get('id'),('', ''))
    if en:e['en']=en
    if note:e['note_en']=note
write(p,json.dumps(events,ensure_ascii=False,indent=2)+'\n')

national_en={
'رأس السنة الميلادية':'New Year’s Day','عيد الجيش العراقي':'Iraqi Army Day','عيد الشرطة العراقية':'Iraqi Police Day','عيد العمال العالمي':'International Workers’ Day','العيد الوطني العراقي':'Iraq National Day','يوم النصر':'Victory Day',
'رأس السنة الميلادية — مناسبة عالمية':'New Year’s Day — international observance','يوم التأسيس':'Founding Day','اليوم الوطني السعودي':'Saudi National Day','يوم العلم الإماراتي':'UAE Flag Day','عيد الاتحاد':'UAE Union Day','العيد الوطني الكويتي':'Kuwait National Day','يوم التحرير':'Liberation Day','اليوم الوطني القطري':'Qatar National Day','العيد الوطني البحريني':'Bahrain National Day','العيد الوطني العُماني':'Oman National Day','يوم الجيش والثورة العربية الكبرى':'Army Day and Great Arab Revolt anniversary','عيد الاستقلال الأردني':'Jordan Independence Day','عيد الشرطة المصرية وذكرى ثورة 25 يناير':'Egyptian Police Day and January 25 Revolution anniversary','عيد تحرير سيناء':'Sinai Liberation Day','عيد العمال':'Workers’ Day','ذكرى ثورة 30 يونيو':'June 30 Revolution anniversary','عيد الثورة المصرية':'Egypt Revolution Day','عيد القوات المسلحة':'Armed Forces Day','يوم المحاربين القدامى':'Veterans Day','عيد الاستقلال الأمريكي':'US Independence Day','عيد الميلاد':'Christmas Day','يوم الصناديق':'Boxing Day','يوم النصر في أوروبا':'Victory in Europe Day','اليوم الوطني الفرنسي':'France National Day','اليوم الوطني الإسباني':'Spain National Day'
}
p=ROOT/'src/data/national-events.json'
national=json.loads(p.read_text(encoding='utf-8'))
for rows in national.values():
    for e in rows:
        e['name_en']=national_en.get(e.get('name_ar'),'National observance')
write(p,json.dumps(national,ensure_ascii=False,indent=2)+'\n')

# --- adhan license metadata -----------------------------------------------
p=ROOT/'src/data/adhan-registry.json'
registry=json.loads(p.read_text(encoding='utf-8'))
for e in registry:
    if e.get('id') in {'commons-morocco-hassan-ii','commons-kazakhstan-shalqar','commons-aaqib-azeez'}:
        e['modification_note']='Source recording converted to OGG for in-app preview and PCM WAV for Android notification playback; no editorial audio changes intended.'
    if e.get('id')=='commons-beautiful-adhan':
        e['modification_note']='Original OGG is used for in-app preview; a PCM WAV derivative is generated for Android notification playback.'
write(p,json.dumps(registry,ensure_ascii=False,indent=2)+'\n')

# --- update manifests -----------------------------------------------------
for fn,channel,asset,title_ar in [
    ('update-trial.json','trial',f'alofok-trial-{VERSION}.apk','تحديث الأفق التجريبي'),
    ('update-plus.json','plus',f'alofok-plus-{VERSION}.apk','تحديث الأفق Plus')
]:
    p=ROOT/fn
    d=json.loads(p.read_text(encoding='utf-8'))
    d.update({
      'channel':channel,'version':VERSION,'versionCode':VERSION_CODE,'title_ar':title_ar,
      'notes_ar':'إصدار تدقيق شامل: فصل النسختين، تدوير الثيمات، إصلاح الإنجليزية، أصوات أذان مرخصة، وتحسين موثوقية الصوت والتنبيهات.',
      'notes_en':'Comprehensive QA release: separate trial/Plus builds, theme rotation, English UI cleanup, licensed Adhan audio, and notification reliability fixes.',
      'download_url':f'https://github.com/1984w18m11-byte/alofok-app/releases/download/v{VERSION}/{asset}',
      'mandatory':False,'published_at':'2026-09-13'
    })
    write(p,json.dumps(d,ensure_ascii=False,indent=2)+'\n')

print('AlofoK 0.5.7 consolidated release repair applied.')
