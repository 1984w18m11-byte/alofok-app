from pathlib import Path
import json

p=Path('App.js')
app=p.read_text(encoding='utf-8')

def rep(old,new):
    global app
    if new in app:
        return
    if old in app:
        app=app.replace(old,new,1)

# English must never fall back to an Arabic label for the trial's only theme.
rep("'auto-time':'Automatic by time of day','dawn':'Dawn and early morning'", "'night':'Free night theme','auto-time':'Automatic by time of day','dawn':'Dawn and early morning'")

# Translate the initial/default location line shown below the GPS button.
rep("<Text numberOfLines={2} style={s.headerLocationText}>{locationBusy?ui('جاري التحديد…','Locating…'):locState}</Text>",
    "<Text numberOfLines={2} style={s.headerLocationText}>{locationBusy?ui('جاري التحديد…','Locating…'):(locState==='بغداد • افتراضي'?ui('بغداد • افتراضي','Baghdad • default'):locState)}</Text>")

# Plus wallpaper dialogs.
rep("if(!IS_PLUS){Alert.alert('ميزة الأفق بلس','ثيمات خلفية الجهاز متاحة لمشتركي الأفق بلس فقط.');return}",
    "if(!IS_PLUS){Alert.alert(ui('ميزة الأفق بلس','AlofoK Plus feature'),ui('ثيمات خلفية الجهاز متاحة لمشتركي الأفق بلس فقط.','Device wallpaper themes are available only in AlofoK Plus.'));return}")
rep("Alert.alert('الخلفيات الثابتة','على الآيفون احفظ الخلفية المختارة ثم طبّقها من إعدادات الجهاز أو الاختصارات.')",
    "Alert.alert(ui('الخلفيات الثابتة','Fixed wallpapers'),ui('على الآيفون احفظ الخلفية المختارة ثم طبّقها من إعدادات الجهاز أو الاختصارات.','On iPhone, save the selected wallpaper and apply it from system settings or Shortcuts.'))")
rep("Alert.alert('الوضع الثابت','لم يسمح الجهاز بالتغيير التلقائي. اختر خلفية ثابتة ثم طبّقها من نافذة أندرويد الرسمية.')",
    "Alert.alert(ui('الوضع الثابت','Fixed mode'),ui('لم يسمح الجهاز بالتغيير التلقائي. اختر خلفية ثابتة ثم طبّقها من نافذة أندرويد الرسمية.','The device did not allow automatic changes. Choose a fixed wallpaper and apply it from the Android system screen.'))")

# Support and advertising dialogs.
rep("if(!SUPPORT_ACCOUNT){Alert.alert('دعم تطوير الأفق','سيُضاف رقم المحفظة أو البطاقة لاحقًا.');return}",
    "if(!SUPPORT_ACCOUNT){Alert.alert(ui('دعم تطوير الأفق','Support AlofoK development'),ui('سيُضاف رقم المحفظة أو البطاقة لاحقًا.','The support wallet or card number will be added later.'));return}")
rep("Alert.alert('تم النسخ','تم نسخ رقم الدعم.');", "Alert.alert(ui('تم النسخ','Copied'),ui('تم نسخ رقم الدعم.','Support number copied.'));")
rep("if(!phone){Alert.alert('أعلن في تطبيق الأفق','سيتم تفعيل التواصل عبر واتساب أو الاتصال بعد إضافة رقم الإعلانات.');return}",
    "if(!phone){Alert.alert(ui('أعلن في تطبيق الأفق','Advertise in AlofoK'),ui('سيتم تفعيل التواصل عبر واتساب أو الاتصال بعد إضافة رقم الإعلانات.','WhatsApp or phone contact will be enabled after an advertising number is added.'));return}")
rep("Linking.openURL(url).catch(()=>Alert.alert('تعذر فتح وسيلة التواصل'));", "Linking.openURL(url).catch(()=>Alert.alert(ui('تعذر فتح وسيلة التواصل','Unable to open contact method')));")

# Update dialog and correct store package for each build variant.
old_update="""  Alert.alert('تحديث جديد متوفر',`الإصدار ${info.version}\n\n${info.notes_ar||'يتوفر إصدار أحدث من تطبيق الأفق.'}`,[
   {text:'لاحقًا',style:'cancel'},
   {text:'الانتقال إلى التحديث',onPress:async()=>{
    const url=DISTRIBUTION_CHANNEL==='play'?(info.play_url||'market://details?id=com.alofok.trial'):(DISTRIBUTION_CHANNEL==='appstore'?(info.app_store_url||info.download_url):info.download_url);
    if(url&&await Linking.canOpenURL(url))await Linking.openURL(url);
    else Alert.alert('الرابط غير متاح','تعذر فتح رابط التحديث الآن.');
   }}
  ]);"""
new_update="""  Alert.alert(ui('تحديث جديد متوفر','New update available'),`${ui('الإصدار','Version')} ${info.version}\n\n${useArabicUi?(info.notes_ar||'يتوفر إصدار أحدث من تطبيق الأفق.'):(info.notes_en||'A newer AlofoK version is available.')}`,[
   {text:ui('لاحقًا','Later'),style:'cancel'},
   {text:ui('الانتقال إلى التحديث','Open update'),onPress:async()=>{
    const storePackage=APP_VARIANT==='paid'?'com.alofok.plus':'com.alofok.trial';
    const url=DISTRIBUTION_CHANNEL==='play'?(info.play_url||`market://details?id=${storePackage}`):(DISTRIBUTION_CHANNEL==='appstore'?(info.app_store_url||info.download_url):info.download_url);
    if(url&&await Linking.canOpenURL(url))await Linking.openURL(url);
    else Alert.alert(ui('الرابط غير متاح','Link unavailable'),ui('تعذر فتح رابط التحديث الآن.','The update link could not be opened right now.'));
   }}
  ]);"""
rep(old_update,new_update)

# GPS statuses and dialogs.
rep("setLocState('خدمة الموقع متوقفة');\n       Alert.alert('تشغيل الموقع','شغّل خدمة الموقع GPS ثم حاول مرة أخرى.');",
    "setLocState(ui('خدمة الموقع متوقفة','Location service is off'));\n       Alert.alert(ui('تشغيل الموقع','Turn on location'),ui('شغّل خدمة الموقع GPS ثم حاول مرة أخرى.','Turn on GPS location services and try again.'));")
rep("setLocState('الموقع غير مسموح');\n       if(showMessage)Alert.alert('الموقع','اختر السماح بالموقع الدقيق من إعدادات Android.');",
    "setLocState(ui('الموقع غير مسموح','Location permission denied'));\n       if(showMessage)Alert.alert(ui('الموقع','Location'),ui('اختر السماح بالموقع الدقيق من إعدادات Android.','Allow precise location in Android settings.'));")
rep("setLocState('جاري تثبيت أدق إشارة GPS…');", "setLocState(ui('جاري تثبيت أدق إشارة GPS…','Locking the most accurate GPS signal…'));")
rep("if(showMessage)Alert.alert('تم تحديث الموقع',`${label}\\nدقة الإشارة التقريبية: ±${accuracy} متر`);",
    "if(showMessage)Alert.alert(ui('تم تحديث الموقع','Location updated'),`${label}\\n${ui('دقة الإشارة التقريبية','Approximate accuracy')}: ±${accuracy} ${ui('متر','m')}`);")
rep("setLocState('تعذر تثبيت موقع دقيق');\n     if(showMessage)Alert.alert('تعذر تحديد الموقع','اخرج إلى مكان مفتوح، فعّل دقة الموقع العالية وWi‑Fi، ثم حاول مرة أخرى.');",
    "setLocState(ui('تعذر تثبيت موقع دقيق','Could not lock an accurate location'));\n     if(showMessage)Alert.alert(ui('تعذر تحديد الموقع','Unable to determine location'),ui('اخرج إلى مكان مفتوح، فعّل دقة الموقع العالية وWi‑Fi، ثم حاول مرة أخرى.','Move to an open area, enable high-accuracy location and Wi‑Fi, then try again.'));")

# Manual city selection status should follow English and use name_en.
rep("setLocState(`${c.name_ar} • اختيار يدوي`);", "setLocState(`${useArabicUi?c.name_ar:(c.name_en||c.name_ar)} • ${ui('اختيار يدوي','manual selection')}`);")
rep("setLocState(`${savedCity.name_ar} • اختيار محفوظ`);", "setLocState(`${useArabicUi?savedCity.name_ar:(savedCity.name_en||savedCity.name_ar)} • ${ui('اختيار محفوظ','saved selection')}`);")

# Adhan preview errors.
rep("if(!asset){Alert.alert(\"الصوت غير متوفر\",\"ملف هذا الأذان غير موجود داخل التطبيق.\");return}",
    "if(!asset){Alert.alert(ui('الصوت غير متوفر','Sound unavailable'),ui('ملف هذا الأذان غير موجود داخل التطبيق.','This Adhan audio file is not included in the app.'));return}")
rep("}catch(e){Alert.alert(\"خطأ\",\"تعذر تشغيل صوت الأذان.\")}",
    "}catch(e){Alert.alert(ui('خطأ','Error'),ui('تعذر تشغيل صوت الأذان.','Unable to play the Adhan sound.'))}")

# Accessibility text on weekly ad.
rep("accessibilityLabel='إغلاق الإعلان'", "accessibilityLabel={ui('إغلاق الإعلان','Close ad')}")

# Notification channel/title/body follow the selected interface language.
rep("name:`الأذان — ${selectedAdhan?.display_ar||'الصوت المختار'}`", "name:useArabicUi?`الأذان — ${selectedAdhan?.display_ar||'الصوت المختار'}`:`Adhan — ${selectedAdhan?.performer||'selected sound'}`")
rep("description:'تشغيل صوت الأذان تلقائيًا عند دخول وقت الصلاة'", "description:ui('تشغيل صوت الأذان تلقائيًا عند دخول وقت الصلاة','Play the selected Adhan automatically at prayer time')")
rep("const prayerNames={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};", "const prayerNames=useArabicUi?{fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'}:{fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'};")
rep("title:`حان وقت صلاة ${title}`", "title:useArabicUi?`حان وقت صلاة ${title}`:`It is time for ${title}`")
rep("body:`يُرفع الآن الأذان بصوت ${selectedAdhan.display_ar}.`", "body:useArabicUi?`يُرفع الآن الأذان بصوت ${selectedAdhan.display_ar}.`:`Adhan is now playing with ${selectedAdhan.performer||'the selected sound'}.`")
rep("name:'تنبيهات الإمساك والإفطار'", "name:ui('تنبيهات الإمساك والإفطار','Imsak and Iftar alerts')")
rep("title:'موعد الإمساك',\n             body:'حان الآن موعد الإمساك بحسب المعيار الفلكي المعتمد في الأفق.'", "title:ui('موعد الإمساك','Imsak time'),\n             body:ui('حان الآن موعد الإمساك بحسب المعيار الفلكي المعتمد في الأفق.','It is now Imsak time according to AlofoK’s astronomical research criterion.')")
rep("title:'موعد الإفطار',\n             body:RAMADAN_VERSE+' — سورة البقرة، الآية 187'", "title:ui('موعد الإفطار','Iftar time'),\n             body:useArabicUi?(RAMADAN_VERSE+' — سورة البقرة، الآية 187'):(RAMADAN_VERSE_EN+' — Al-Baqarah 2:187')")

p.write_text(app,encoding='utf-8')

# English performer labels for the licensed sounds, so English mode does not
# show the Arabic word "تسجيل" in the sound list.
rp=Path('src/data/adhan-registry.json')
registry=json.loads(rp.read_text(encoding='utf-8'))
for item in registry:
    if item.get('id')=='commons-morocco-hassan-ii': item['performer']='Fraguando'
    if item.get('id')=='commons-kazakhstan-shalqar': item['performer']='Esetok'
rp.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('Second final QA pass applied: English fallbacks, GPS, dialogs, notifications, and sound labels.')
