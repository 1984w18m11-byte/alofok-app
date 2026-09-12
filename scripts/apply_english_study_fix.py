from pathlib import Path

app_path=Path('App.js')
app=app_path.read_text(encoding='utf-8')


def replace_once(old,new,label):
    global app
    if new in app:
        return
    count=app.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    app=app.replace(old,new,1)

# A small helper for text that was previously hard-coded in Arabic.
replace_once(
    " const t=makeTranslator(appLanguage);",
    " const t=makeTranslator(appLanguage);\n const systemLocale=Intl.DateTimeFormat().resolvedOptions().locale||'ar';\n const useArabicUi=appLanguage==='ar'||(appLanguage==='system'&&String(systemLocale).toLowerCase().startsWith('ar'));\n const ui=(ar,en)=>useArabicUi?ar:en;",
    'ui language helper'
)

replace_once(
    "const COPYRIGHT_SUMMARY='© 2026 وسام محمد — جميع الحقوق محفوظة. يُمنح المستخدم حقًا شخصيًا لاستخدام النسخة التي حصل عليها بصورة مشروعة. يُحظر نسخ التطبيق أو إعادة بيعه أو نشره أو تعديله أو استخراج تصميمه وأصوله دون إذن كتابي. شراء النسخة المدفوعة لا ينقل ملكية التطبيق. تبقى المكتبات والأصوات الخارجية خاضعة لتراخيص أصحابها.';",
    "const COPYRIGHT_SUMMARY='© 2026 وسام محمد — جميع الحقوق محفوظة. يُمنح المستخدم حقًا شخصيًا لاستخدام النسخة التي حصل عليها بصورة مشروعة. يُحظر نسخ التطبيق أو إعادة بيعه أو نشره أو تعديله أو استخراج تصميمه وأصوله دون إذن كتابي. شراء النسخة المدفوعة لا ينقل ملكية التطبيق. تبقى المكتبات والأصوات الخارجية خاضعة لتراخيص أصحابها.';\nconst PRIVACY_SUMMARY_EN='AlofoK uses precise location while the app is running to calculate prayer times and show the nearby area name. Coordinates and preferences are stored locally and are not sent to the developer or advertiser. The trial edition may show one direct ad per week after review, without an ad network or advertising tracking. The app connects to GitHub only to check the release version and does not send your coordinates. There are no user accounts and we do not sell personal data.';\nconst COPYRIGHT_SUMMARY_EN='© 2026 Wisam Mohammed — All rights reserved. The user receives a personal right to use a legitimately obtained copy. Copying, reselling, republishing, modifying, or extracting the app design and assets without written permission is prohibited. Purchasing the paid edition does not transfer ownership of the app. External libraries and audio remain subject to their owners’ licenses.';",
    'English policy summaries'
)

# Language note
replace_once(
    "     <Text style={s.policyMeta}>يشمل خيار لغة الجهاز اللغات والمناطق التي يدعمها نظام الهاتف، مع خيارات مستقلة للإنجليزية الأمريكية والأسترالية والبريطانية.</Text>",
    "     <Text style={s.policyMeta}>{ui('يشمل خيار لغة الجهاز اللغات والمناطق التي يدعمها نظام الهاتف، مع خيارات مستقلة للإنجليزية الأمريكية والأسترالية والبريطانية.','Device language follows the languages and regions supported by your phone, with separate options for US, Australian and British English.')}</Text>",
    'language note'
)

# Membership / Plus section
replace_once(
    "    <SettingsCard title={IS_PLUS?'عضوية الأفق بلس':'الترقية إلى الأفق بلس'}>",
    "    <SettingsCard title={IS_PLUS?ui('عضوية الأفق بلس','AlofoK Plus Membership'):ui('الترقية إلى الأفق بلس','Upgrade to AlofoK Plus')}>",
    'plus title'
)
replace_once(
    "     <View style={s.membershipBadge}><Text style={s.membershipBadgeText}>{IS_PLUS?'PLUS مفعّلة للمعاينة':'النسخة المجانية'}</Text></View>",
    "     <View style={s.membershipBadge}><Text style={s.membershipBadgeText}>{IS_PLUS?ui('PLUS مفعّلة للمعاينة','PLUS active'):ui('النسخة المجانية','Free edition')}</Text></View>",
    'plus badge'
)
replace_once(
    "     <View style={s.compactInfoRow}><View style={s.compactSquare}><Text style={s.compactSquareIcon}>✦</Text></View><View style={s.compactInfoText}><Text style={s.membershipTitle}>{IS_PLUS?'جميع مزايا الأفق بلس مفتوحة':'الأفق بلس — 5 دولارات سنويًا'}</Text><Text style={s.sub}>{IS_PLUS?'كل الثيمات والأصوات المرخصة متاحة، ولا تظهر الإعلانات.':'يفتح جميع الثيمات والأصوات المرخصة ويزيل الإعلان الأسبوعي.'}</Text></View></View>",
    "     <View style={s.compactInfoRow}><View style={s.compactSquare}><Text style={s.compactSquareIcon}>✦</Text></View><View style={s.compactInfoText}><Text style={s.membershipTitle}>{IS_PLUS?ui('جميع مزايا الأفق بلس مفتوحة','All AlofoK Plus features are unlocked'):ui('الأفق بلس — 5 دولارات سنويًا','AlofoK Plus — $5 per year')}</Text><Text style={s.sub}>{IS_PLUS?ui('كل الثيمات والأصوات المرخصة متاحة، ولا تظهر الإعلانات.','All themes and licensed sounds are available and ads are removed.'):ui('يفتح جميع الثيمات والأصوات المرخصة ويزيل الإعلان الأسبوعي.','Unlocks all themes and licensed sounds and removes the weekly ad.')}</Text></View></View>",
    'plus info'
)
replace_once(
    "<Text style={s.compactAction}>الاشتراك السنوي — 5$</Text><Text style={s.compactSub}>فتح مزايا الأفق بلس</Text>",
    "<Text style={s.compactAction}>{ui('الاشتراك السنوي — 5$','Annual subscription — $5')}</Text><Text style={s.compactSub}>{ui('فتح مزايا الأفق بلس','Unlock AlofoK Plus features')}</Text>",
    'annual subscription text'
)
replace_once(
    "<Text style={s.compactTitle}>استعادة المشتريات</Text><Text style={s.compactSub}>إعادة فحص حالة الاشتراك</Text>",
    "<Text style={s.compactTitle}>{ui('استعادة المشتريات','Restore purchases')}</Text><Text style={s.compactSub}>{ui('إعادة فحص حالة الاشتراك','Recheck subscription status')}</Text>",
    'restore purchase text'
)

# Add-on store
replace_once("    {IS_PLUS&&<SettingsCard title='متجر الإضافات'>","    {IS_PLUS&&<SettingsCard title={ui('متجر الإضافات','Add-ons Store')}>",'store title')
replace_once("     <Text style={s.text}>مكان مخصص مستقبلاً لشراء ثيمات وأصوات وحزم موسمية بصورة منفردة.</Text>","     <Text style={s.text}>{ui('مكان مخصص مستقبلاً لشراء ثيمات وأصوات وحزم موسمية بصورة منفردة.','Reserved for future individual purchases of themes, sounds and seasonal packs.')}</Text>",'store body')
replace_once("<Text style={s.shopText}>ثيمات</Text>","<Text style={s.shopText}>{ui('ثيمات','Themes')}</Text>",'themes label')
replace_once("<Text style={s.shopText}>أصوات</Text>","<Text style={s.shopText}>{ui('أصوات','Sounds')}</Text>",'sounds label')
replace_once("<Text style={s.shopText}>حزم موسمية</Text>","<Text style={s.shopText}>{ui('حزم موسمية','Seasonal packs')}</Text>",'seasonal label')

# Update status text
replace_once("{updateInfo?`تحديث جديد — الإصدار ${updateInfo.version}`:t('checkUpdate')}","{updateInfo?ui(`تحديث جديد — الإصدار ${updateInfo.version}`,`New update — version ${updateInfo.version}`):t('checkUpdate')}",'update available title')
replace_once("{updateChecking?t('checking'):updateInfo?'اضغط لعرض التفاصيل والتحديث':`الإصدار الحالي ${APP_VERSION}`}","{updateChecking?t('checking'):updateInfo?ui('اضغط لعرض التفاصيل والتحديث','Tap to view details and update'):ui(`الإصدار الحالي ${APP_VERSION}`,`Current version ${APP_VERSION}`)}",'update subtitle')
replace_once("{lastUpdateCheck&&<Text style={s.lastCheck}>آخر فحص: {lastUpdateCheck.toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})}</Text>}","{lastUpdateCheck&&<Text style={s.lastCheck}>{ui('آخر فحص: ','Last check: ')}{lastUpdateCheck.toLocaleTimeString(useArabicUi?'ar-IQ':'en-US',{hour:'2-digit',minute:'2-digit'})}</Text>}",'last update check')

# Adhan controls still hard-coded in Arabic
replace_once("<Text style={s.stopButtonText}>■ إيقاف المعاينة</Text>","<Text style={s.stopButtonText}>■ {ui('إيقاف المعاينة','Stop preview')}</Text>",'stop preview')
replace_once("<View style={s.volumeBox}><Text style={s.text}>مستوى الصوت — {Math.round(adhanVolume*100)}٪</Text>","<View style={s.volumeBox}><Text style={s.text}>{ui('مستوى الصوت','Volume')} — {Math.round(adhanVolume*100)}%</Text>",'volume label')
replace_once("{showAdhanLicense?'إخفاء ترخيص الصوت':'عرض ترخيص الصوت المختار'}","{showAdhanLicense?ui('إخفاء ترخيص الصوت','Hide sound license'):ui('عرض ترخيص الصوت المختار','Show selected sound license')}",'license toggle')
replace_once("<Text style={s.licenseLink}>فتح صفحة المصدر والترخيص</Text>","<Text style={s.licenseLink}>{ui('فتح صفحة المصدر والترخيص','Open source and license page')}</Text>",'license link')
replace_once("<Text style={s.sub}>سورة البقرة — الآية 187</Text>","<Text style={s.sub}>{ui('سورة البقرة — الآية 187','Surah Al-Baqarah — verse 187')}</Text>",'baqarah ref')

# Calendar research section: full study, both Arabic and English.
old_study="""    <SettingsCard title='شرح التقويم العربي'>
     <Pressable style={s.secondaryButton} onPress={()=>setShowCalendarExplanation(v=>!v)}><Text style={s.secondaryButtonText}>{showCalendarExplanation?'إخفاء الشرح والمصادر':'فتح الشرح التفصيلي والمصادر'}</Text></Pressable>
     {showCalendarExplanation&&<>
      <Text style={s.policyText}>يعرض تطبيق الأفق تصورًا بحثيًا لتقويم عربي قمري–شمسي، تُربط فيه أسماء الشهور العربية بمواسمها اللغوية؛ فيأتي ربيع الأول وربيع الآخر في فصل الربيع، ويقع رمضان قرب نهاية الشهر التاسع وبداية العاشر. تُستخدم المعالجة الفلكية للموازنة بين الدورة القمرية والسنة الشمسية.</Text>
      <Text style={[s.policyText,{color:'#e0bd70'}]}>﴿الشَّمْسُ وَالْقَمَرُ بِحُسْبَانٍ﴾ — الرحمن: 5</Text>
      <Text style={s.policyMeta}>هذه فرضية بحثية مقترحة وليست تقويمًا شرعيًا أو رسميًا معتمدًا. الروابط الآتية تفتح نتائج الحلقات المتخصصة، وتُحدّث النتائج عند نشر مواد جديدة.</Text>
      {CALENDAR_REFERENCE_LINKS.map(([label,url])=><Pressable key={url} style={s.referenceLink} onPress={()=>Linking.openURL(url).catch(()=>Alert.alert('تعذر فتح الرابط'))}><Text style={s.referenceLinkText}>↗ {label}</Text></Pressable>)}
     </>}
    </SettingsCard>"""
new_study="""    <SettingsCard title={ui('شرح التقويم العربي','Arabic Calendar Research')}>
     <Pressable style={s.secondaryButton} onPress={()=>setShowCalendarExplanation(v=>!v)}><Text style={s.secondaryButtonText}>{showCalendarExplanation?ui('إخفاء الشرح والمصادر','Hide explanation and sources'):ui('فتح الشرح التفصيلي والمصادر','Open detailed explanation and sources')}</Text></Pressable>
     {showCalendarExplanation&&<>
      <Text style={s.policyText}>{ui('يعرض تطبيق الأفق تصورًا بحثيًا لتقويم عربي قمري–شمسي، تُربط فيه أسماء الشهور العربية بمواسمها اللغوية؛ فيأتي ربيع الأول وربيع الآخر في فصل الربيع، ويقع رمضان قرب نهاية الشهر التاسع وبداية العاشر. تُستخدم المعالجة الفلكية للموازنة بين الدورة القمرية والسنة الشمسية.','AlofoK presents a research model of an Arabic lunisolar calendar in which the traditional Arabic month names are connected with their seasonal meanings. Rabi I and Rabi II are placed in spring, while Ramadan is placed near the end of the ninth month and the beginning of the tenth. Astronomical balancing is used to reconcile the lunar cycle with the solar year.')}</Text>
      <Text style={[s.policyText,{color:'#e0bd70'}]}>{ui('﴿الشَّمْسُ وَالْقَمَرُ بِحُسْبَانٍ﴾ — الرحمن: 5','“The sun and the moon move by precise calculation.” — Ar-Rahman 55:5')}</Text>
      <Text style={s.policyText}>{ui('متوسط الشهر القمري الاقتراني: 29.530588853 يوم ≈ 29 يومًا و12 ساعة و44 دقيقة و3 ثوانٍ.','Mean synodic lunar month: 29.530588853 days ≈ 29 days, 12 hours, 44 minutes and 3 seconds.')}</Text>
      <Text style={s.policyText}>{ui('السنة القمرية الحسابية بلا كبيسة (12 شهرًا): 354.367066236 يوم ≈ 354 يومًا و8 ساعات و48 دقيقة و35 ثانية.','Calculated lunar year without intercalation (12 months): 354.367066236 days ≈ 354 days, 8 hours, 48 minutes and 35 seconds.')}</Text>
      <Text style={s.policyText}>{ui('السنة الشمسية المدارية بلا إضافة كبيسة: 365.2421875 يوم ≈ 365 يومًا و5 ساعات و48 دقيقة و45 ثانية.','Tropical solar year before calendar leap-day adjustment: 365.2421875 days ≈ 365 days, 5 hours, 48 minutes and 45 seconds.')}</Text>
      <Text style={s.policyText}>{ui('الفارق بين السنة الشمسية والسنة القمرية بلا نسيء: نحو 10 أيام و21 ساعة و10 ثوانٍ كل سنة.','Difference between the solar and 12-month lunar year without intercalation: about 10 days, 21 hours and 10 seconds per year.')}</Text>
      <Text style={s.policyText}>{ui('في دورة 19 سنة: 19 سنة شمسية ≈ 235 شهرًا قمريًا. لذلك يضيف النموذج 7 أشهر نسيء خلال الدورة؛ فتكون 7 سنوات كبيسة من 13 شهرًا، والباقي 12 شهرًا. وباستخدام المتوسطات أعلاه يكون الفرق النظري بين 19 سنة شمسية و235 شهرًا قمريًا نحو ساعتين و5 دقائق فقط.','Over a 19-year cycle: 19 solar years ≈ 235 lunar months. The model therefore inserts 7 Nasi’ intercalary months in the cycle, producing 7 leap years of 13 months while the remaining years have 12 months. Using the averages above, the theoretical difference between 19 solar years and 235 lunar months is only about 2 hours and 5 minutes.')}</Text>
      <Text style={[s.policyText,{color:'#e0bd70'}]}>{ui('﴿وَلَبِثُوا فِي كَهْفِهِمْ ثَلَاثَ مِائَةٍ سِنِينَ وَازْدَادُوا تِسْعًا﴾ — الكهف: 25','“And they remained in their cave for three hundred years and exceeded by nine.” — Al-Kahf 18:25')}</Text>
      <Text style={s.policyText}>{ui('ملاحظة حسابية: 300 سنة شمسية وفق المتوسط أعلاه تعادل نحو 309.21 سنة قمرية. لذلك يظهر فرق يقارب تسع سنوات عند المقارنة التقريبية بين العدّ الشمسي والقمري. هذا تقارب عددي ضمن الدراسة، وليس وحده دليلًا على صحة النموذج المقترح.','Calculation note: 300 solar years using the mean above equal about 309.21 lunar years. This produces a difference of roughly nine years when solar and lunar counting are compared approximately. This numerical correspondence is part of the research discussion and is not, by itself, proof of the proposed model.')}</Text>
      <Text style={s.policyMeta}>{ui('هذه فرضية بحثية مقترحة وليست تقويمًا شرعيًا أو رسميًا معتمدًا. الروابط الآتية تفتح نتائج الحلقات المتخصصة، وتُحدّث النتائج عند نشر مواد جديدة.','This is a proposed research hypothesis, not an officially or religiously adopted calendar. The links below open relevant specialist material and search results can change as new material is published.')}</Text>
      {CALENDAR_REFERENCE_LINKS.map(([label,url],index)=><Pressable key={url} style={s.referenceLink} onPress={()=>Linking.openURL(url).catch(()=>Alert.alert(ui('تعذر فتح الرابط','Unable to open link')))}><Text style={s.referenceLinkText}>↗ {useArabicUi?label:['Mohammad Shahrour episodes on the Hijri calendar and Arabic months','Mohammad Shahrour episodes on the sacred months and Hajj','Mohammad Shahrour episodes on Ramadan and the ninth month'][index]}</Text></Pressable>)}
     </>}
    </SettingsCard>"""
if new_study not in app:
    if app.count(old_study)!=1:
        raise SystemExit(f'calendar study block: expected 1 match, found {app.count(old_study)}')
    app=app.replace(old_study,new_study,1)

# Themes and wallpaper sections
replace_once("    <SettingsCard title='الثيمات'>","    <SettingsCard title={ui('الثيمات','Themes')}>",'theme title')
replace_once("     <Text style={s.sub}>{IS_PLUS?'اختر من جميع ثيمات الأفق بلس، وسيُحفظ اختيارك تلقائيًا.':'الثيم الليلي متاح مجاناً. بقية الثيمات ضمن الأفق بلس.'}</Text>","     <Text style={s.sub}>{IS_PLUS?ui('اختر من جميع ثيمات الأفق بلس، وسيُحفظ اختيارك تلقائيًا.','Choose from all AlofoK Plus themes. Your selection is saved automatically.'):ui('الثيم الليلي متاح مجاناً. بقية الثيمات ضمن الأفق بلس.','The night theme is available for free. Other themes are included with AlofoK Plus.')}</Text>",'theme description')
replace_once("    {IS_PLUS&&<SettingsCard title='ثيمات خلفية الجهاز'>","    {IS_PLUS&&<SettingsCard title={ui('ثيمات خلفية الجهاز','Device Wallpaper Themes')}>",'wallpaper title')
replace_once("<Text style={s.text}>تفعيل ثيمات الموبايل</Text><Text style={s.sub}>لا يتم التفعيل إلا بعد موافقتك من نظام الجهاز.</Text>","<Text style={s.text}>{ui('تفعيل ثيمات الموبايل','Enable phone themes')}</Text><Text style={s.sub}>{ui('لا يتم التفعيل إلا بعد موافقتك من نظام الجهاز.','The feature is enabled only after you approve it in the device system.')}</Text>",'wallpaper enable')
replace_once("     <Text style={s.sub}>طريقة التغيير</Text>","     <Text style={s.sub}>{ui('طريقة التغيير','Change mode')}</Text>",'wallpaper mode heading')
replace_once("     <Text style={s.sub}>مكان الخلفية</Text>","     <Text style={s.sub}>{ui('مكان الخلفية','Wallpaper target')}</Text>",'wallpaper target heading')
replace_once("<Text style={s.warn}>وضع الخلفية الثابتة: اختر ثيمًا من الأعلى ثم افتح نافذة النظام لتطبيقه.</Text>","<Text style={s.warn}>{ui('وضع الخلفية الثابتة: اختر ثيمًا من الأعلى ثم افتح نافذة النظام لتطبيقه.','Fixed wallpaper mode: choose a theme above, then open the system screen to apply it.')}</Text>",'wallpaper fixed note')
replace_once("<Text style={s.secondaryButtonText}>فتح إعدادات خلفية الجهاز</Text>","<Text style={s.secondaryButtonText}>{ui('فتح إعدادات خلفية الجهاز','Open device wallpaper settings')}</Text>",'wallpaper settings button')
replace_once("<Text style={s.policyMeta}>قد تختلف خيارات الشاشة الرئيسية والقفل حسب الشركة وإصدار أندرويد. لا يتجاوز الأفق قرار النظام.</Text>","<Text style={s.policyMeta}>{ui('قد تختلف خيارات الشاشة الرئيسية والقفل حسب الشركة وإصدار أندرويد. لا يتجاوز الأفق قرار النظام.','Home and lock screen options may vary by manufacturer and Android version. AlofoK does not override system restrictions.')}</Text>",'wallpaper policy')

# City names in non-Arabic mode
replace_once("<Text style={item.id===city?.id?s.cityChoiceTextActive:s.cityChoiceText}>{item.name_ar}</Text>","<Text style={item.id===city?.id?s.cityChoiceTextActive:s.cityChoiceText}>{useArabicUi?item.name_ar:(item.name_en||item.name_ar)}</Text>",'city display name')

# Trial advertising section
replace_once("    {APP_VARIANT==='trial'&&<SettingsCard title='الإعلان في تطبيق الأفق'>","    {APP_VARIANT==='trial'&&<SettingsCard title={ui('الإعلان في تطبيق الأفق','Advertising in AlofoK')}>",'advertising title')
replace_once("     <Text style={s.text}>مساحة لإعلان واحد في الأسبوع. لا يظهر أي إعلان عندما لا توجد حملة فعّالة.</Text>","     <Text style={s.text}>{ui('مساحة لإعلان واحد في الأسبوع. لا يظهر أي إعلان عندما لا توجد حملة فعّالة.','Space for one advertisement per week. No ad appears when there is no active campaign.')}</Text>",'advertising description')
replace_once("<Text style={s.secondaryButtonText}>أعلن في تطبيق الأفق</Text>","<Text style={s.secondaryButtonText}>{ui('أعلن في تطبيق الأفق','Advertise in AlofoK')}</Text>",'advertise button')
replace_once("     <Text style={s.sub}>التواصل عبر واتساب أو الاتصال سيُفعّل بعد إضافة رقم الإعلانات.</Text>","     <Text style={s.sub}>{ui('التواصل عبر واتساب أو الاتصال سيُفعّل بعد إضافة رقم الإعلانات.','WhatsApp or phone contact will be enabled after an advertising contact number is added.')}</Text>",'advertising contact')

# Privacy and copyright sections
replace_once("     <Text style={s.text}>الموقع لحساب المواقيت فقط، والتفضيلات محفوظة على جهازك.</Text>","     <Text style={s.text}>{ui('الموقع لحساب المواقيت فقط، والتفضيلات محفوظة على جهازك.','Location is used only to calculate times. Your preferences are stored on your device.')}</Text>",'privacy short')
replace_once("{showPrivacy?'إخفاء السياسة':'قراءة سياسة الخصوصية'}","{showPrivacy?ui('إخفاء السياسة','Hide policy'):ui('قراءة سياسة الخصوصية','Read Privacy Policy')}",'privacy toggle')
replace_once("{showPrivacy&&<><Text style={s.policyText}>{PRIVACY_SUMMARY}</Text><Text style={s.policyMeta}>سارية على النسختين • آخر تحديث: 6 سبتمبر 2026</Text></>}","{showPrivacy&&<><Text style={s.policyText}>{ui(PRIVACY_SUMMARY,PRIVACY_SUMMARY_EN)}</Text><Text style={s.policyMeta}>{ui('سارية على النسختين • آخر تحديث: 6 سبتمبر 2026','Applies to both editions • Last updated: September 6, 2026')}</Text></>}",'privacy full')
replace_once("     <Text style={s.text}>© 2026 الأفق — تصميم وفكرة وتطوير: وسام محمد</Text>","     <Text style={s.text}>{ui('© 2026 الأفق — تصميم وفكرة وتطوير: وسام محمد','© 2026 AlofoK — Design, concept and development: Wisam Mohammed')}</Text>",'copyright short')
replace_once("{showCopyright?'إخفاء السياسة':'قراءة سياسة الطبع والتوزيع'}","{showCopyright?ui('إخفاء السياسة','Hide policy'):ui('قراءة سياسة الطبع والتوزيع','Read Copyright and Distribution Policy')}",'copyright toggle')
replace_once("{showCopyright&&<><Text style={s.policyText}>{COPYRIGHT_SUMMARY}</Text><Text style={s.policyMeta}>المكونات الخارجية تبقى خاضعة لتراخيص أصحابها.</Text></>}","{showCopyright&&<><Text style={s.policyText}>{ui(COPYRIGHT_SUMMARY,COPYRIGHT_SUMMARY_EN)}</Text><Text style={s.policyMeta}>{ui('المكونات الخارجية تبقى خاضعة لتراخيص أصحابها.','External components remain subject to their owners’ licenses.')}</Text></>}",'copyright full')

# Validate the requested study text exists.
required=[
    "354.367066236",
    "365.2421875",
    "10 أيام و21 ساعة",
    "235 شهرًا قمريًا",
    "7 أشهر نسيء",
    "وَلَبِثُوا فِي كَهْفِهِمْ",
    "309.21",
    "Arabic Calendar Research",
    "Advertising in AlofoK",
    "Read Privacy Policy",
]
for marker in required:
    if marker not in app:
        raise SystemExit(f'missing required marker: {marker}')

app_path.write_text(app,encoding='utf-8')
print('AlofoK English UI and calendar study patch applied successfully.')
