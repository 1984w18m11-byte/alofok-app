from pathlib import Path

p=Path('App.js')
app=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global app
    if new in app:
        return
    n=app.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    app=app.replace(old,new,1)

# English rendering for bundled Arabic-only metadata.
rep(
    "const RAMADAN_VERSE='وَكُلُوا وَاشْرَبُوا حَتَّىٰ يَتَبَيَّنَ لَكُمُ الْخَيْطُ الْأَبْيَضُ مِنَ الْخَيْطِ الْأَسْوَدِ مِنَ الْفَجْرِ ۖ ثُمَّ أَتِمُّوا الصِّيَامَ إِلَى اللَّيْلِ';",
    "const RAMADAN_VERSE='وَكُلُوا وَاشْرَبُوا حَتَّىٰ يَتَبَيَّنَ لَكُمُ الْخَيْطُ الْأَبْيَضُ مِنَ الْخَيْطِ الْأَسْوَدِ مِنَ الْفَجْرِ ۖ ثُمَّ أَتِمُّوا الصِّيَامَ إِلَى اللَّيْلِ';\nconst RAMADAN_VERSE_EN='Eat and drink until the white thread of dawn becomes distinct from the black thread, then complete the fast until night.';\nconst THEME_LABELS_EN={\n 'auto-time':'Automatic by time of day','dawn':'Dawn and early morning','morning':'Morning','midday':'Daytime','sunset':'Sunset','evening':'Evening','starry-night':'Night and stars','moon-night':'Night and moon',\n 'muharram':'Muharram','safar':'Safar','rabi1':'Rabi I','rabi2':'Rabi II','jumada1':'Jumada I','jumada2':'Jumada II','rajab':'Rajab','shaban':\"Sha'ban\",'ramadan':'Ramadan','shawwal':'Shawwal','dhulqida':'Dhu al-Qidah','dhulhijja':'Dhu al-Hijjah',\n 'spring':'Spring','summer':'Summer','autumn':'Autumn','winter':'Winter','new-year':'New Year','earth-sun':'Solstice and equinox','solar-eclipse':'Solar eclipse','lunar-eclipse':'Lunar eclipse','galaxy':'Galaxy and stars'\n};",
    'English Ramadan and theme labels'
)

rep("{LANGUAGE_CHOICES.find(([id])=>id===appLanguage)?.[1]||'لغة الجهاز'}","{LANGUAGE_CHOICES.find(([id])=>id===appLanguage)?.[1]||t('deviceLanguage')}",'device language fallback')

# Upgrade and restore dialogs.
rep(
    "onPress={()=>Alert.alert('معاينة فقط','يتم الاشتراك في الأفق Plus عبر Zain Cash. بعد تأكيد الدفع اذهب إلى البحث عن تحديث لتنزيل تحديث Plus الخاص بك.')}",
    "onPress={()=>Alert.alert(ui('معاينة فقط','Preview only'),ui('يتم الاشتراك في الأفق Plus عبر Zain Cash. بعد تأكيد الدفع اذهب إلى البحث عن تحديث لتنزيل تحديث Plus الخاص بك.','AlofoK Plus is activated through Zain Cash. After payment is confirmed, open Check for Updates to receive your Plus update.'))}",
    'upgrade dialog'
)
rep(
    "onPress={()=>Alert.alert('استعادة المشتريات','يعيد النظام التحقق من ترخيص الأفق المرتبط بهذا الجهاز. إذا كان اشتراك Plus فعالاً سيظهر تحديث Plus.')}",
    "onPress={()=>Alert.alert(ui('استعادة المشتريات','Restore purchases'),ui('يعيد النظام التحقق من ترخيص الأفق المرتبط بهذا الجهاز. إذا كان اشتراك Plus فعالاً سيظهر تحديث Plus.','The system rechecks the AlofoK license linked to this device. If Plus is active, the Plus update will become available.'))}",
    'restore dialog'
)

# Adhan selector and license details.
rep("{selectedAdhan?.display_ar||t('chooseAdhan')}","{selectedAdhan?(useArabicUi?selectedAdhan.display_ar:(selectedAdhan.performer||selectedAdhan.display_ar)):t('chooseAdhan')}",'selected adhan label')
rep("<Text style={s.text}>{p.display_ar}</Text>","<Text style={s.text}>{useArabicUi?p.display_ar:(p.performer||p.display_ar)}</Text>",'adhan list label')
old_license="{selectedAdhan.status==='licensed'?'✓ الترخيص: '+(selectedAdhan.license||'غير محدد')+' • المصدر: '+(selectedAdhan.source||'غير محدد'):(selectedAdhan.note_ar||'هذا التسجيل يحتاج إلى إثبات تصريح قبل إضافته للتطبيق.')}"
new_license="{selectedAdhan.status==='licensed'?ui('✓ الترخيص: '+(selectedAdhan.license||'غير محدد')+' • المصدر: '+(selectedAdhan.source||'غير محدد'),'✓ License: '+(selectedAdhan.license||'Not specified')+' • Source: '+(selectedAdhan.source||'Not specified')):ui((selectedAdhan.note_ar||'هذا التسجيل يحتاج إلى إثبات تصريح قبل إضافته للتطبيق.'),'This recording requires documented permission before it can be included in the app.')}"
rep(old_license,new_license,'adhan license details')
rep("<Text style={s.text}>الإمساك: {fasting.imsak}  •  الإفطار: {fasting.iftar}</Text><Text style={[s.text,{marginTop:12,lineHeight:28}]}>{RAMADAN_VERSE}</Text>","<Text style={s.text}>{ui('الإمساك','Imsak')}: {fasting.imsak}  •  {ui('الإفطار','Iftar')}: {fasting.iftar}</Text><Text style={[s.text,{marginTop:12,lineHeight:28}]}>{ui(RAMADAN_VERSE,RAMADAN_VERSE_EN)}</Text>",'Ramadan English content')

# Theme labels.
rep("<Text style={s.themeChoiceText}>{label}</Text>","<Text style={s.themeChoiceText}>{useArabicUi?label:(THEME_LABELS_EN[id]||label)}</Text>",'theme choice labels')

# Wallpaper mode and target labels.
rep("[['time','حسب وقت اليوم'],['lunar','حسب الشهر القمري'],['season','حسب الفصل'],['fixed','ثيم ثابت']].map(([id,label])=>", "[['time',ui('حسب وقت اليوم','By time of day')],['lunar',ui('حسب الشهر القمري','By lunar month')],['season',ui('حسب الفصل','By season')],['fixed',ui('ثيم ثابت','Fixed theme')]].map(([id,label])=>", 'wallpaper mode labels')
rep("[['home','الشاشة الرئيسية'],['lock','شاشة القفل'],['both','الاثنتان']].map(([id,label])=>", "[['home',ui('الشاشة الرئيسية','Home screen')],['lock',ui('شاشة القفل','Lock screen')],['both',ui('الاثنتان','Both')]].map(([id,label])=>", 'wallpaper target labels')
rep("Alert.alert('الآيفون','احفظ الصورة وطبّقها يدوياً أو بواسطة تطبيق الاختصارات.')", "Alert.alert(ui('الآيفون','iPhone'),ui('احفظ الصورة وطبّقها يدوياً أو بواسطة تطبيق الاختصارات.','Save the image and apply it manually or with the Shortcuts app.'))", 'iPhone wallpaper dialog')

required=['THEME_LABELS_EN','Stop preview','Show selected sound license','By lunar month','Home screen','RAMADAN_VERSE_EN']
for marker in required:
    if marker not in app:
        raise SystemExit(f'missing marker: {marker}')

p.write_text(app,encoding='utf-8')
print('Remaining English settings cleanup applied successfully.')
