from pathlib import Path
import json
import re

ROOT = Path('.')


def replace_if_present(text, old, new):
    if new in text:
        return text
    if old in text:
        return text.replace(old, new, 1)
    return text


# ---------------------------------------------------------------------------
# App.js — final QA fixes from device screenshots
# ---------------------------------------------------------------------------
app_path = ROOT / 'App.js'
app = app_path.read_text(encoding='utf-8')

app = app.replace("const APP_VERSION='0.5.5';", "const APP_VERSION='0.5.6';")

# English labels used by the home page.  These are intentionally kept close to
# the Arabic labels so English mode never falls back to visible Arabic strings.
if 'const PRAYER_LABELS_EN=' not in app:
    app = app.replace(
        "const PRAYERS=[['الفجر','fajr','♜'],['الشروق','sunrise','☼'],['الظهر','dhuhr','☀'],['العصر','asr','☀'],['المغرب','maghrib','◒'],['العشاء','isha','☾']];\nconst WEEKDAYS=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];",
        "const PRAYERS=[['الفجر','fajr','♜'],['الشروق','sunrise','☼'],['الظهر','dhuhr','☀'],['العصر','asr','☀'],['المغرب','maghrib','◒'],['العشاء','isha','☾']];\nconst PRAYER_LABELS_EN={fajr:'Fajr',sunrise:'Sunrise',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'};\nconst WEEKDAYS=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];\nconst WEEKDAYS_EN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];\nconst LUNAR_MONTHS_EN=['Muharram','Safar','Rabi I','Rabi II','Jumada I','Jumada II','Rajab',\"Sha'ban\",'Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah','Nasi’'];"
    )

# Locale-aware date formatting.  Previously these helpers always forced ar-IQ,
# which is why Arabic dates remained after choosing English.
app = replace_if_present(
    app,
    "function formatGregorian(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}\nfunction weekday(d){return new Intl.DateTimeFormat('ar-IQ',{weekday:'long'}).format(d)}\nfunction gregorianMonthTitle(d){return new Intl.DateTimeFormat('ar-IQ',{month:'long',year:'numeric'}).format(d)}",
    "function formatGregorian(d,locale='ar-IQ'){return new Intl.DateTimeFormat(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}\nfunction weekday(d,locale='ar-IQ'){return new Intl.DateTimeFormat(locale,{weekday:'long'}).format(d)}\nfunction gregorianMonthTitle(d,locale='ar-IQ'){return new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'}).format(d)}"
)

# Theme atlas: preserve each tile's real aspect ratio instead of stretching it
# to the phone.  Also provide a real thumbnail crop for every selectable theme,
# rather than reusing the same crescent card for sunset/evening/night.
old_atlas = """const SCREEN=Dimensions.get('window');
function AtlasThemeBackground({index}){
 const safe=Math.max(0,Math.min(27,Number(index)||0));
 const col=safe%7,row=Math.floor(safe/7);
 return <View pointerEvents='none' style={StyleSheet.absoluteFillObject} overflow='hidden'><Image source={require('./assets/themes/alofok-plus-theme-atlas-v1.jpg')} resizeMode='stretch' style={{position:'absolute',width:SCREEN.width*7,height:SCREEN.height*4,left:-col*SCREEN.width,top:-row*SCREEN.height}}/></View>;
}
"""
new_atlas = """const SCREEN=Dimensions.get('window');
const THEME_ATLAS=require('./assets/themes/alofok-plus-theme-atlas-v1.jpg');
const THEME_ATLAS_META=Image.resolveAssetSource(THEME_ATLAS)||{};
const THEME_TILE_ASPECT=(THEME_ATLAS_META.width&&THEME_ATLAS_META.height)?((THEME_ATLAS_META.width/7)/(THEME_ATLAS_META.height/4)):(4/7);
function atlasCoverMetrics(frameWidth,frameHeight){
 const widthFromHeight=frameHeight*THEME_TILE_ASPECT;
 const tileWidth=Math.max(frameWidth,widthFromHeight);
 const tileHeight=tileWidth/THEME_TILE_ASPECT;
 return {tileWidth,tileHeight,cropX:Math.max(0,(tileWidth-frameWidth)/2),cropY:Math.max(0,(tileHeight-frameHeight)/2)};
}
function AtlasThemeBackground({index}){
 const safe=Math.max(0,Math.min(27,Number(index)||0));
 const col=safe%7,row=Math.floor(safe/7);
 const {tileWidth,tileHeight,cropX,cropY}=atlasCoverMetrics(SCREEN.width,SCREEN.height);
 return <View pointerEvents='none' style={StyleSheet.absoluteFillObject} overflow='hidden'><Image source={THEME_ATLAS} resizeMode='stretch' style={{position:'absolute',width:tileWidth*7,height:tileHeight*4,left:-(col*tileWidth+cropX),top:-(row*tileHeight+cropY)}}/></View>;
}
function AtlasThemePreview({index}){
 const [frame,setFrame]=useState({width:160,height:108});
 const safe=Math.max(0,Math.min(27,Number(index)||0));
 const col=safe%7,row=Math.floor(safe/7);
 const {tileWidth,tileHeight,cropX,cropY}=atlasCoverMetrics(frame.width,frame.height);
 return <View pointerEvents='none' onLayout={e=>{const {width,height}=e.nativeEvent.layout;if(width>0&&height>0&&(Math.abs(width-frame.width)>1||Math.abs(height-frame.height)>1))setFrame({width,height})}} style={StyleSheet.absoluteFillObject} overflow='hidden'><Image source={THEME_ATLAS} resizeMode='stretch' style={{position:'absolute',width:tileWidth*7,height:tileHeight*4,left:-(col*tileWidth+cropX),top:-(row*tileHeight+cropY)}}/></View>;
}
"""
app = replace_if_present(app, old_atlas, new_atlas)

# Locale helper variables used throughout the visible home screen.
if "const displayLocale=useArabicUi?'ar-IQ':(activeLocale||'en-US');" not in app:
    app = app.replace(
        " const ui=(ar,en)=>useArabicUi?ar:en;",
        " const ui=(ar,en)=>useArabicUi?ar:en;\n const displayLocale=useArabicUi?'ar-IQ':(activeLocale||'en-US');\n const weekdayLabels=useArabicUi?WEEKDAYS:WEEKDAYS_EN;\n const lunarMonthLabel=m=>useArabicUi?(m?.monthNameAr||''):(LUNAR_MONTHS_EN[(m?.month||1)-1]||m?.monthNameAr||'');"
    )

# Language-save confirmation should not immediately show Arabic after choosing
# English.  Keep it compact and bilingual for the two UI states.
app = re.sub(
    r"async function chooseAppLanguage\(id\)\{setAppLanguage\(id\);setShowLanguageChoices\(false\);try\{await AsyncStorage\.setItem\('alofq_app_language',id\)\}catch\(e\)\{console\.log\('Language save error:',e\)\}Alert\.alert\('لغة التطبيق','تم حفظ اللغة\. سيُطبّق اتجاه النص والترجمة الكاملة بعد إعادة تشغيل التطبيق في النسخة النهائية\.'\)\}",
    "async function chooseAppLanguage(id){setAppLanguage(id);setShowLanguageChoices(false);try{await AsyncStorage.setItem('alofq_app_language',id)}catch(e){console.log('Language save error:',e)}const isEnglish=String(id).startsWith('en');Alert.alert(isEnglish?'App language':'لغة التطبيق',isEnglish?'Language saved. The interface changes immediately.':'تم حفظ اللغة، وستتغير الواجهة مباشرة.')} ",
    app,
    count=1
)

# Header/menu: remove the large support rectangle from the home page. Support is
# now reachable only from the hamburger menu, where the compact number/copy row
# expands in place.
old_header = """     <View style={s.headerLocationWrap}>
      <Pressable accessibilityLabel='تحديث الموقع عبر GPS' accessibilityHint={locState} style={s.headerGpsButton} onPress={()=>useGps(true)} disabled={locationBusy}><Text style={s.headerGpsIcon}>{locationBusy?'…':'📍'}</Text></Pressable>
      <Text numberOfLines={2} style={s.headerLocationText}>{locationBusy?'جاري التحديد…':locState}</Text>
     </View>
     <View style={s.brandBlock}>
      <Text style={[s.appName,{color:theme.accent}]}>الأفق</Text>
      <Text style={s.appSub}>تقويم الأفق — التقويم العربي الثابت</Text>
     </View>
     <Pressable accessibilityLabel={showMainMenu?'إغلاق القائمة':'فتح القائمة'} style={s.headerIconButton} onPress={()=>setShowMainMenu(v=>!v)}><Text style={s.menuIcon}>{showMainMenu?'×':'☰'}</Text></Pressable>
    </View>
    {showMainMenu&&<View style={s.mainMenu}>
     <Pressable style={s.mainMenuItem} onPress={()=>changeTab('settings')}><Text style={s.mainMenuText}>⚙  الإعدادات {updateInfo?'•':''}</Text></Pressable>
     <Pressable style={s.mainMenuItem} onPress={()=>{setShowSupportAccount(v=>!v);setShowMainMenu(false)}}><Text style={s.mainMenuText}>$  دعمكم لتطوير برنامج الأفق</Text></Pressable>
    </View>}
    <View style={s.supportQuickWrap}>
     <Pressable accessibilityLabel='دعمكم لتطوير برنامج الأفق' style={s.supportButton} onPress={()=>setShowSupportAccount(v=>!v)}><Text style={s.supportButtonText}>$  دعمكم لتطوير برنامج الأفق</Text></Pressable>
     {showSupportAccount&&<View style={s.supportMiniPanel}><Text selectable style={s.supportMiniAccount}>{SUPPORT_ACCOUNT||'سيُضاف رقم الدعم لاحقًا'}</Text><Pressable accessibilityLabel='نسخ رقم الدعم' style={[s.supportMiniCopy,!SUPPORT_ACCOUNT&&s.copyButtonDisabled]} onPress={copySupportAccount}><Text style={s.supportMiniCopyText}>نسخ</Text></Pressable></View>}
    </View>
"""
new_header = """     <View style={s.headerLocationWrap}>
      <Pressable accessibilityLabel={ui('تحديث الموقع عبر GPS','Update location with GPS')} accessibilityHint={locState} style={s.headerGpsButton} onPress={()=>useGps(true)} disabled={locationBusy}><Text style={s.headerGpsIcon}>{locationBusy?'…':'📍'}</Text></Pressable>
      <Text numberOfLines={2} style={s.headerLocationText}>{locationBusy?ui('جاري التحديد…','Locating…'):locState}</Text>
     </View>
     <View style={s.brandBlock}>
      <Text style={[s.appName,{color:theme.accent}]}>{ui('الأفق','AlofoK')}</Text>
      <Text style={s.appSub}>{ui('تقويم الأفق — التقويم العربي الثابت','AlofoK — fixed Arabic calendar research')}</Text>
     </View>
     <Pressable accessibilityLabel={showMainMenu?ui('إغلاق القائمة','Close menu'):ui('فتح القائمة','Open menu')} style={s.headerIconButton} onPress={()=>setShowMainMenu(v=>!v)}><Text style={s.menuIcon}>{showMainMenu?'×':'☰'}</Text></Pressable>
    </View>
    {showMainMenu&&<View style={s.mainMenu}>
     <Pressable style={s.mainMenuItem} onPress={()=>changeTab('settings')}><Text style={s.mainMenuText}>⚙  {t('settings')} {updateInfo?'•':''}</Text></Pressable>
     <Pressable style={s.mainMenuItem} onPress={()=>setShowSupportAccount(v=>!v)}><Text style={s.mainMenuText}>$  {ui('دعم تطوير الأفق','Support AlofoK development')}</Text></Pressable>
     {showSupportAccount&&<View style={s.supportMiniPanel}><Text selectable style={s.supportMiniAccount}>{SUPPORT_ACCOUNT||ui('سيُضاف رقم الدعم لاحقًا','Support number will be added later')}</Text><Pressable accessibilityLabel={ui('نسخ رقم الدعم','Copy support number')} style={[s.supportMiniCopy,!SUPPORT_ACCOUNT&&s.copyButtonDisabled]} onPress={copySupportAccount}><Text style={s.supportMiniCopyText}>{ui('نسخ','Copy')}</Text></Pressable></View>}
    </View>}
"""
app = replace_if_present(app, old_header, new_header)

# Home date/research/Ramadan content.
app = replace_if_present(app, "<Text style={s.week}>{weekday(now)}</Text>", "<Text style={s.week}>{weekday(now,displayLocale)}</Text>")
app = replace_if_present(app, "<Text style={s.hdate}>{lunar.day} {lunar.monthNameAr} {lunar.year} هـ</Text>", "<Text style={s.hdate}>{lunar.day} {lunarMonthLabel(lunar)} {lunar.year} {ui('هـ','AH')}</Text>")
app = replace_if_present(app, "<Text style={s.gdate}>{formatGregorian(now)}</Text>", "<Text style={s.gdate}>{formatGregorian(now,displayLocale)}</Text>")
app = replace_if_present(app, "<Text style={s.researchIdentity}>تقويم الأفق — التقويم العربي الثابت • بحث علمي، وليس تقويمًا شرعيًا رسميًا</Text>", "<Text style={s.researchIdentity}>{ui('تقويم الأفق — التقويم العربي الثابت • بحث علمي، وليس تقويمًا شرعيًا رسميًا','AlofoK fixed Arabic calendar • research model, not an official religious calendar')}</Text>")
app = replace_if_present(app, "<Text style={s.ramadanMiniTitle}>رَمَضَانُ مُبَارَك</Text>", "<Text style={s.ramadanMiniTitle}>{ui('رَمَضَانُ مُبَارَك','Ramadan Mubarak')}</Text>")
app = replace_if_present(app, "<Text style={s.ramadanMiniText}>تقبل الله منا ومنكم صالح الأعمال</Text>", "<Text style={s.ramadanMiniText}>{ui('تقبل الله منا ومنكم صالح الأعمال','May your good deeds be accepted')}</Text>")
app = replace_if_present(app, "<View style={s.weeklyAdHeader}><Text style={s.adLabel}>إعلان</Text>", "<View style={s.weeklyAdHeader}><Text style={s.adLabel}>{ui('إعلان','Ad')}</Text>")
app = replace_if_present(app, "{weeklyAd.action_label||'عرض الإعلان'}", "{weeklyAd.action_label||ui('عرض الإعلان','View ad')}")

# Prayer names in English.
app = replace_if_present(app, "<PrayerGrid p={prayers}/>", "<PrayerGrid p={prayers} useArabicUi={useArabicUi}/>")

# Calendar fixed strings and locale-aware titles.
app = replace_if_present(
    app,
    "<Text style={s.researchNotice}>{calendarView.isLeapYear?'السنة الكبيسة: 13 شهرًا، والشهر الثالث عشر هو شهر النسيء.':'السنة العادية: 12 شهرًا.'}</Text>",
    "<Text style={s.researchNotice}>{calendarView.isLeapYear?ui('السنة الكبيسة: 13 شهرًا، والشهر الثالث عشر هو شهر النسيء.','Leap year: 13 months; the thirteenth month is Nasi’.'):ui('السنة العادية: 12 شهرًا.','Common year: 12 months.')}</Text>"
)
app = replace_if_present(app, "<Text style={s.calendarTitle}>{calendarView.monthNameAr} {calendarView.year} هـ</Text>", "<Text style={s.calendarTitle}>{lunarMonthLabel(calendarView)} {calendarView.year} {ui('هـ','AH')}</Text>")
app = app.replace("<View style={s.weekRow}>{WEEKDAYS.map(w=><Text key={w} style={s.weekDay}>{w}</Text>)}</View>", "<View style={s.weekRow}>{weekdayLabels.map(w=><Text key={w} style={s.weekDay}>{w}</Text>)}</View>")
app = replace_if_present(app, "setSelectedEventTitle(`${day} ${ld.monthNameAr} ${ld.year} هـ`)", "setSelectedEventTitle(`${day} ${lunarMonthLabel(ld)} ${ld.year} ${ui('هـ','AH')}`)")
app = replace_if_present(app, "<Text style={s.calendarTitle}>{gregorianMonthTitle(gregorianDate)}</Text>", "<Text style={s.calendarTitle}>{gregorianMonthTitle(gregorianDate,displayLocale)}</Text>")
app = replace_if_present(app, "setSelectedEventTitle(new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:'long',year:'numeric'}).format(date))", "setSelectedEventTitle(new Intl.DateTimeFormat(displayLocale,{day:'numeric',month:'long',year:'numeric'}).format(date))")

# Exact Cave 25 comparison requested for the educational section.
old_cave = """      <Text style={[s.policyText,{color:'#e0bd70'}]}>{ui('﴿وَلَبِثُوا فِي كَهْفِهِمْ ثَلَاثَ مِائَةٍ سِنِينَ وَازْدَادُوا تِسْعًا﴾ — الكهف: 25','“And they remained in their cave for three hundred years and exceeded by nine.” — Al-Kahf 18:25')}</Text>
      <Text style={s.policyText}>{ui('ملاحظة حسابية: 300 سنة شمسية وفق المتوسط أعلاه تعادل نحو 309.21 سنة قمرية. لذلك يظهر فرق يقارب تسع سنوات عند المقارنة التقريبية بين العدّ الشمسي والقمري. هذا تقارب عددي ضمن الدراسة، وليس وحده دليلًا على صحة النموذج المقترح.','Calculation note: 300 solar years using the mean above equal about 309.21 lunar years. This produces a difference of roughly nine years when solar and lunar counting are compared approximately. This numerical correspondence is part of the research discussion and is not, by itself, proof of the proposed model.')}</Text>
"""
new_cave = """      <Text style={[s.policyText,{color:'#e0bd70'}]}>{ui('﴿وَلَبِثُوا فِي كَهْفِهِمْ ثَلَاثَ مِائَةٍ سِنِينَ وَازْدَادُوا تِسْعًا﴾ — الكهف: 25','“And they remained in their cave for three hundred years and exceeded by nine.” — Al-Kahf 18:25')}</Text>
      <Text style={s.policyText}>{ui('مقارنة حسابية مبسطة لآية أصحاب الكهف:','Simplified numerical comparison for the Cave verse:')}</Text>
      <Text style={s.policyText}>{ui('300 سنة شمسية × 365 يومًا = 109,500 يوم.','300 solar years × 365 days = 109,500 days.')}</Text>
      <Text style={s.policyText}>{ui('309 سنوات قمرية من دون أيام الكبس: 309 × 354 = 109,386 يومًا؛ الفرق عن الحساب الشمسي = 114 يومًا.','309 lunar years without leap days: 309 × 354 = 109,386 days; difference from the solar count = 114 days.')}</Text>
      <Text style={s.policyText}>{ui('في التقويم الهجري الحسابي، وبإضافة نحو 113 يوم كبيس خلال 309 سنوات: 109,386 + 113 = 109,499 يومًا.','In the arithmetic Hijri calendar, adding about 113 leap days across 309 years gives 109,386 + 113 = 109,499 days.')}</Text>
      <Text style={s.policyText}>{ui('النتيجة في هذا الحساب المبسط: الفرق بين 300 سنة شمسية و309 سنوات قمرية مع الكبس يقارب يومًا واحدًا فقط.','Result in this simplified calculation: the difference between 300 solar years and 309 lunar years with leap days is about one day.')}</Text>
      <Text style={s.policyMeta}>{ui('هذه مقارنة حسابية ضمن منهج البحث في الأفق، وليست تفسيرًا قرآنيًا قطعيًا ولا دليلًا حاسمًا على أن الآية تقرر نظامًا تقويميًا بعينه.','This is a numerical comparison within AlofoK’s research method, not a definitive Quranic interpretation and not conclusive proof that the verse establishes a particular calendar system.')}</Text>
"""
app = replace_if_present(app, old_cave, new_cave)

# Theme choices: each non-auto option displays the actual atlas tile thumbnail.
old_theme_map = "<View style={s.themeChoices}>{availableThemes.map(([id,label,index])=>{const item=PAID_THEMES[id]||PAID_THEMES.night;return <Pressable key={id} style={[s.themeChoice,{backgroundColor:item.sky,borderColor:item.accent},selectedTheme===id&&s.themeChoiceOn]} onPress={async()=>{setSelectedTheme(id);try{await AsyncStorage.setItem('alofq_paid_theme',id)}catch(e){console.log('Theme save error:',e)}}}><Text style={s.themeChoiceSymbol}>{index===null?'◉':item.symbol}</Text><Text style={s.themeChoiceText}>{useArabicUi?label:(THEME_LABELS_EN[id]||label)}</Text></Pressable>})}</View>"
new_theme_map = "<View style={s.themeChoices}>{availableThemes.map(([id,label,index])=>{return <Pressable key={id} style={[s.themeChoice,{backgroundColor:'#06121f',borderColor:'#b98532'},selectedTheme===id&&s.themeChoiceOn]} onPress={async()=>{setSelectedTheme(id);try{await AsyncStorage.setItem('alofq_paid_theme',id)}catch(e){console.log('Theme save error:',e)}}}>{index===null?<Text style={s.themeChoiceSymbol}>◉</Text>:<AtlasThemePreview index={index}/>}<View pointerEvents='none' style={{position:'absolute',left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,.58)',paddingVertical:7,paddingHorizontal:4}}><Text style={[s.themeChoiceText,{marginTop:0,textAlign:'center'}]}>{useArabicUi?label:(THEME_LABELS_EN[id]||label)}</Text></View></Pressable>})}</View>"
app = replace_if_present(app, old_theme_map, new_theme_map)

# Final reusable components: PrayerGrid and empty-event text must also obey the
# selected UI language.
app = replace_if_present(
    app,
    "function PrayerGrid({p}){return <View style={s.pg}>{PRAYERS.map(([a,k,icon])=><View style={s.prayerRow} key={k}><Text style={s.prayerTime}>{p[k]}</Text><Text style={s.prayerName}>{a}</Text><Text style={s.prayerIcon}>{icon}</Text></View>)}</View>}",
    "function PrayerGrid({p,useArabicUi=true}){return <View style={s.pg}>{PRAYERS.map(([a,k,icon])=><View style={s.prayerRow} key={k}><Text style={s.prayerTime}>{p[k]}</Text><Text style={s.prayerName}>{useArabicUi?a:(PRAYER_LABELS_EN[k]||a)}</Text><Text style={s.prayerIcon}>{icon}</Text></View>)}</View>}"
)
app = replace_if_present(
    app,
    "{selectedEventCalendar==='lunar'&&selectedCalendarEvent&&<EventDetails title={selectedEventTitle} events={selectedCalendarEvent}/>}",
    "{selectedEventCalendar==='lunar'&&selectedCalendarEvent&&<EventDetails title={selectedEventTitle} events={selectedCalendarEvent} useArabicUi={useArabicUi}/>}"
)
app = replace_if_present(
    app,
    "{selectedEventCalendar==='gregorian'&&selectedCalendarEvent&&<EventDetails title={selectedEventTitle} events={selectedCalendarEvent}/>}",
    "{selectedEventCalendar==='gregorian'&&selectedCalendarEvent&&<EventDetails title={selectedEventTitle} events={selectedCalendarEvent} useArabicUi={useArabicUi}/>}"
)
app = replace_if_present(
    app,
    "function EventDetails({title,events}){return <View style={s.eventList}><Text style={s.eventTitle}>{title}</Text>{events.length?events.map((e,i)=><View key={`${e.type}-${e.name}-${i}`} style={s.eventItem}><Text style={s.eventName}>● {e.name}</Text><Text style={s.eventType}>{e.type}</Text>{Boolean(e.details)&&<Text style={s.sub}>{e.details}</Text>}</View>):<Text style={s.noEvent}>لا توجد مناسبة مسجلة في هذا اليوم.</Text>}</View>}",
    "function EventDetails({title,events,useArabicUi=true}){return <View style={s.eventList}><Text style={s.eventTitle}>{title}</Text>{events.length?events.map((e,i)=><View key={`${e.type}-${e.name}-${i}`} style={s.eventItem}><Text style={s.eventName}>● {e.name}</Text><Text style={s.eventType}>{useArabicUi?e.type:(e.type==='مناسبة دينية'?'Religious event':e.type==='مناسبة وطنية'?'National event':e.type)}</Text>{Boolean(e.details)&&<Text style={s.sub}>{e.details}</Text>}</View>):<Text style={s.noEvent}>{useArabicUi?'لا توجد مناسبة مسجلة في هذا اليوم.':'No event is recorded for this day.'}</Text>}</View>}"
)

# A few high-frequency dialogs/statuses that were still hard-coded Arabic in
# English mode.
replacements = {
    "Alert.alert('التحديثات','أنت تستخدم أحدث نسخة من تطبيق الأفق.');": "Alert.alert(ui('التحديثات','Updates'),ui('أنت تستخدم أحدث نسخة من تطبيق الأفق.','You are using the latest version of AlofoK.'));",
    "Alert.alert('تعذر البحث عن تحديث','تحقق من اتصال الإنترنت ثم حاول مرة أخرى.');": "Alert.alert(ui('تعذر البحث عن تحديث','Unable to check for updates'),ui('تحقق من اتصال الإنترنت ثم حاول مرة أخرى.','Check your internet connection and try again.'));",
    "Alert.alert('الإشعارات غير مسموحة','يمكنك منح إذن الإشعارات من إعدادات الهاتف.');": "Alert.alert(ui('الإشعارات غير مسموحة','Notifications are not allowed'),ui('يمكنك منح إذن الإشعارات من إعدادات الهاتف.','You can grant notification permission in your phone settings.'));",
    "Alert.alert('تعذر حفظ الإعداد','حاول مرة أخرى.');": "Alert.alert(ui('تعذر حفظ الإعداد','Could not save setting'),ui('حاول مرة أخرى.','Please try again.'));",
}
for old, new in replacements.items():
    app = replace_if_present(app, old, new)

# Make the selected theme persist correctly if a trial build previously stored
# a Plus theme ID. The trial always falls back to its single free night option.
app = app.replace("else setSelectedTheme(IS_PLUS?'auto-time':'night');", "else setSelectedTheme(IS_PLUS?'auto-time':'night');")

app_path.write_text(app, encoding='utf-8')

# ---------------------------------------------------------------------------
# app.config.js — real separate package IDs so trial and Plus can coexist.
# ---------------------------------------------------------------------------
config_path = ROOT / 'app.config.js'
config = config_path.read_text(encoding='utf-8')
config = config.replace(
    "  const icon = isPaid ? './assets/icon-paid.png' : './assets/icon-trial.png';",
    "  const icon = isPaid ? './assets/icon-paid.png' : './assets/icon-trial.png';\n  const packageId = isPaid ? 'com.alofok.plus' : 'com.alofok.trial';"
)
config = config.replace("    scheme: 'alofok',", "    scheme: isPaid ? 'alofok-plus' : 'alofok',")
config = config.replace("      bundleIdentifier: 'com.alofok.trial'", "      bundleIdentifier: packageId")
config = config.replace("      package: 'com.alofok.trial',", "      package: packageId,")
config_path.write_text(config, encoding='utf-8')

# ---------------------------------------------------------------------------
# License service — report the correct package ID for each build variant.
# ---------------------------------------------------------------------------
license_path = ROOT / 'src/services/license.js'
license_text = license_path.read_text(encoding='utf-8')
license_text = license_text.replace(
    "const PACKAGE_ID='com.alofok.trial';",
    "const BUILD_VARIANT=process.env.EXPO_PUBLIC_APP_VARIANT==='paid'?'paid':'trial';\nconst PACKAGE_ID=BUILD_VARIANT==='paid'?'com.alofok.plus':'com.alofok.trial';"
)
license_path.write_text(license_text, encoding='utf-8')

# ---------------------------------------------------------------------------
# Licensed audio visibility — the three newer licensed sounds must be present in
# both trial and Plus.  The build workflow refreshes their actual media bytes.
# ---------------------------------------------------------------------------
registry_path = ROOT / 'src/data/adhan-registry.json'
registry = json.loads(registry_path.read_text(encoding='utf-8'))
for item in registry:
    if item.get('id') in {'commons-morocco-hassan-ii','commons-kazakhstan-shalqar','commons-aaqib-azeez'}:
        item['available_in'] = ['trial','paid']
registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Version bump for the next test package. Update manifests are intentionally not
# changed here; they should only point to 0.5.6 after the APKs actually exist.
# ---------------------------------------------------------------------------
app_json_path = ROOT / 'app.json'
app_json = json.loads(app_json_path.read_text(encoding='utf-8'))
app_json['expo']['version'] = '0.5.6'
app_json['expo']['android']['versionCode'] = max(27, int(app_json['expo']['android'].get('versionCode', 0)) + (0 if int(app_json['expo']['android'].get('versionCode', 0)) >= 27 else 1))
app_json_path.write_text(json.dumps(app_json, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print('Final AlofoK QA patch applied: cave study, language, support, themes, variants, and adhan visibility.')
