from pathlib import Path

p=Path('App.js')
app=p.read_text(encoding='utf-8')

def rep(old,new):
    global app
    if new in app:
        return
    if old in app:
        app=app.replace(old,new,1)

# Update dialog: all visible strings follow the selected language and the Play
# package fallback points to the correct trial/Plus application.
rep("Alert.alert('تحديث جديد متوفر',`الإصدار ${info.version}\\n\\n${info.notes_ar||'يتوفر إصدار أحدث من تطبيق الأفق.'}`,[",
    "Alert.alert(ui('تحديث جديد متوفر','New update available'),`${ui('الإصدار','Version')} ${info.version}\\n\\n${useArabicUi?(info.notes_ar||'يتوفر إصدار أحدث من تطبيق الأفق.'):(info.notes_en||'A newer AlofoK version is available.')}`,[")
rep("{text:'لاحقًا',style:'cancel'},", "{text:ui('لاحقًا','Later'),style:'cancel'},")
rep("{text:'الانتقال إلى التحديث',onPress:async()=>{", "{text:ui('الانتقال إلى التحديث','Open update'),onPress:async()=>{")
rep("const url=DISTRIBUTION_CHANNEL==='play'?(info.play_url||'market://details?id=com.alofok.trial'):(DISTRIBUTION_CHANNEL==='appstore'?(info.app_store_url||info.download_url):info.download_url);",
    "const storePackage=APP_VARIANT==='paid'?'com.alofok.plus':'com.alofok.trial';\\n    const url=DISTRIBUTION_CHANNEL==='play'?(info.play_url||`market://details?id=${storePackage}`):(DISTRIBUTION_CHANNEL==='appstore'?(info.app_store_url||info.download_url):info.download_url);")
rep("else Alert.alert('الرابط غير متاح','تعذر فتح رابط التحديث الآن.');", "else Alert.alert(ui('الرابط غير متاح','Link unavailable'),ui('تعذر فتح رابط التحديث الآن.','The update link could not be opened right now.'));")

# If a saved GPS coordinate exists but no saved label, use the English seeded
# city name when English is selected.
rep("const restoredLabel=savedLabel||savedCity?.name_ar||'موقعي المحفوظ';",
    "const restoredLabel=savedLabel||(useArabicUi?savedCity?.name_ar:savedCity?.name_en)||ui('موقعي المحفوظ','Saved location');")

# License gate also follows the saved app language, so startup/activation never
# drops back to Arabic after the user selected English.
old_start="""function AlofoKLicenseGate(){
 const [licenseState,setLicenseState]=useState({status:'checking',tier:'trial',reason:null});
 useEffect(()=>{"""
new_start="""function AlofoKLicenseGate(){
 const [gateLanguage,setGateLanguage]=useState('system');
 const gateSystemLocale=Intl.DateTimeFormat().resolvedOptions().locale||'ar';
 const gateUseArabic=gateLanguage==='ar'||(gateLanguage==='system'&&String(gateSystemLocale).toLowerCase().startsWith('ar'));
 const gateUi=(ar,en)=>gateUseArabic?ar:en;
 const [licenseState,setLicenseState]=useState({status:'checking',tier:'trial',reason:null});
 useEffect(()=>{AsyncStorage.getItem('alofq_app_language').then(v=>{if(v)setGateLanguage(v)}).catch(()=>{})},[]);
 useEffect(()=>{"""
rep(old_start,new_start)

rep("Alert.alert('التفعيل الرسمي','لم يتم ضبط رابط التفعيل الرسمي بعد. فعّل EXPO_PUBLIC_OFFICIAL_PORTAL_URL قبل إصدار النسخة العامة.');",
    "Alert.alert(gateUi('التفعيل الرسمي','Official activation'),gateUi('لم يتم ضبط رابط التفعيل الرسمي بعد. فعّل EXPO_PUBLIC_OFFICIAL_PORTAL_URL قبل إصدار النسخة العامة.','The official activation portal has not been configured yet.'));")
rep("}catch(e){Alert.alert('تعذر فتح التفعيل','حاول مرة أخرى بعد التأكد من اتصال الإنترنت.')}",
    "}catch(e){Alert.alert(gateUi('تعذر فتح التفعيل','Unable to open activation'),gateUi('حاول مرة أخرى بعد التأكد من اتصال الإنترنت.','Check your internet connection and try again.'))}")

old_check=""" if(licenseState.status==='checking')return <View style={{flex:1,backgroundColor:'#020b12',alignItems:'center',justifyContent:'center',padding:28}}><Text style={{color:'#f4bb52',fontSize:20,fontWeight:'900',textAlign:'center'}}>الأفق</Text><Text style={{color:'#c8d3da',fontSize:13,marginTop:10,textAlign:'center'}}>جاري التحقق من النسخة الرسمية…</Text></View>;
 if(licenseState.status!=='ready')return <View style={{flex:1,backgroundColor:'#020b12',alignItems:'center',justifyContent:'center',padding:28}}><Text style={{color:'#f4bb52',fontSize:20,fontWeight:'900',textAlign:'center'}}>{licenseState.status==='plus_required'?'الأفق Plus غير مفعّل':'هذه النسخة تحتاج تفعيلًا رسميًا'}</Text><Text style={{color:'#c8d3da',fontSize:13,lineHeight:22,marginTop:12,textAlign:'center'}}>{licenseState.status==='plus_required'?'هذه نسخة Plus ولا تعمل على هذا الجهاز إلا إذا كان اشتراك Plus فعالًا ومؤكدًا.':'نسخ ملف APK إلى هاتف آخر لا ينقل ترخيص الاستخدام. فعّل هذا الجهاز من قناة الأفق الرسمية.'}</Text><Pressable onPress={openOfficialActivation} style={{marginTop:20,minHeight:46,paddingHorizontal:18,borderRadius:12,backgroundColor:'#efb44d',alignItems:'center',justifyContent:'center'}}><Text style={{color:'#111820',fontWeight:'900'}}>التفعيل من المصدر الرسمي</Text></Pressable></View>;"""
new_check=""" if(licenseState.status==='checking')return <View style={{flex:1,backgroundColor:'#020b12',alignItems:'center',justifyContent:'center',padding:28}}><Text style={{color:'#f4bb52',fontSize:20,fontWeight:'900',textAlign:'center'}}>{gateUi('الأفق','AlofoK')}</Text><Text style={{color:'#c8d3da',fontSize:13,marginTop:10,textAlign:'center'}}>{gateUi('جاري التحقق من النسخة الرسمية…','Checking the official installation…')}</Text></View>;
 if(licenseState.status!=='ready')return <View style={{flex:1,backgroundColor:'#020b12',alignItems:'center',justifyContent:'center',padding:28}}><Text style={{color:'#f4bb52',fontSize:20,fontWeight:'900',textAlign:'center'}}>{licenseState.status==='plus_required'?gateUi('الأفق Plus غير مفعّل','AlofoK Plus is not activated'):gateUi('هذه النسخة تحتاج تفعيلًا رسميًا','This copy requires official activation')}</Text><Text style={{color:'#c8d3da',fontSize:13,lineHeight:22,marginTop:12,textAlign:'center'}}>{licenseState.status==='plus_required'?gateUi('هذه نسخة Plus ولا تعمل على هذا الجهاز إلا إذا كان اشتراك Plus فعالًا ومؤكدًا.','This Plus build works only when an active Plus subscription is confirmed on this device.'):gateUi('نسخ ملف APK إلى هاتف آخر لا ينقل ترخيص الاستخدام. فعّل هذا الجهاز من قناة الأفق الرسمية.','Copying the APK to another phone does not transfer the license. Activate this device through the official AlofoK channel.')}</Text><Pressable onPress={openOfficialActivation} style={{marginTop:20,minHeight:46,paddingHorizontal:18,borderRadius:12,backgroundColor:'#efb44d',alignItems:'center',justifyContent:'center'}}><Text style={{color:'#111820',fontWeight:'900'}}>{gateUi('التفعيل من المصدر الرسمي','Activate from official source')}</Text></Pressable></View>;"""
rep(old_check,new_check)

p.write_text(app,encoding='utf-8')
print('Third final QA pass applied: update dialog, saved location, and license-gate language.')
