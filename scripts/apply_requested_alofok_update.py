from pathlib import Path

app_path=Path('App.js')
app=app_path.read_text()

def replace_once(old,new,label):
    global app
    count=app.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    app=app.replace(old,new,1)

if "./src/services/license" not in app:
    replace_once(
        "import {makeTranslator} from './src/i18n/translations';",
        "import {makeTranslator} from './src/i18n/translations';\nimport {verifyEntitlement,activateOfficialInstall,extractActivationToken,getOfficialActivationUrl} from './src/services/license';",
        'license import'
    )

if "TRIAL_UPDATE_MANIFEST_URL" not in app:
    replace_once(
        "const UPDATE_MANIFEST_URL='https://raw.githubusercontent.com/1984w18m11-byte/alofok-app/main/update.json';",
        "const TRIAL_UPDATE_MANIFEST_URL='https://raw.githubusercontent.com/1984w18m11-byte/alofok-app/main/update-trial.json';\nconst PLUS_UPDATE_MANIFEST_URL='https://raw.githubusercontent.com/1984w18m11-byte/alofok-app/main/update-plus.json';",
        'split update manifests'
    )

if "const IS_PAID_BUILD=" not in app:
    replace_once("const IS_PLUS=APP_VARIANT==='paid';","const IS_PAID_BUILD=APP_VARIANT==='paid';",'paid build constant')

if "function AlofoKApp({licenseTier='trial'})" not in app:
    replace_once(
        "export default function App(){",
        "function AlofoKApp({licenseTier='trial'}){\n const IS_PLUS=IS_PAID_BUILD&&licenseTier==='plus';",
        'licensed app component'
    )

old_fetch="   const response=await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`,{headers:{'Cache-Control':'no-cache'}});"
if old_fetch in app:
    replace_once(
        old_fetch,
        "   const entitlement=await verifyEntitlement({appVersion:APP_VERSION,appVariant:APP_VARIANT});\n   if(!entitlement.valid)throw new Error(`LICENSE_${entitlement.reason||'REQUIRED'}`);\n   const manifestUrl=entitlement.tier==='plus'?PLUS_UPDATE_MANIFEST_URL:TRIAL_UPDATE_MANIFEST_URL;\n   const response=await fetch(`${manifestUrl}?t=${Date.now()}`,{headers:{'Cache-Control':'no-cache'}});",
        'license-aware update channel'
    )

app=app.replace(
    "سيُفعّل الشراء الحقيقي بعد إنشاء اشتراك الأفق بلس في Google Play وApp Store.",
    "يتم الاشتراك في الأفق Plus عبر Zain Cash. بعد تأكيد الدفع اذهب إلى البحث عن تحديث لتنزيل تحديث Plus الخاص بك."
)
app=app.replace(
    "هذا زر معاينة حالياً. عند ربط المتجر سيستعيد الاشتراك المرتبط بحساب Google أو Apple.",
    "يعيد النظام التحقق من ترخيص الأفق المرتبط بهذا الجهاز. إذا كان اشتراك Plus فعالاً سيظهر تحديث Plus."
)
app=app.replace("استعادة اشتراك Google أو Apple","إعادة فحص حالة الاشتراك")

if "function AlofoKLicenseGate()" not in app:
    app += r'''

function AlofoKLicenseGate(){
 const [licenseState,setLicenseState]=useState({status:'checking',tier:'trial',reason:null});
 useEffect(()=>{
  let mounted=true;
  async function applyResult(result){
   if(!mounted)return;
   if(!result?.valid){setLicenseState({status:'blocked',tier:'trial',reason:result?.reason||'official_activation_required'});return}
   if(IS_PAID_BUILD&&result.tier!=='plus'){setLicenseState({status:'plus_required',tier:'trial',reason:'plus_subscription_required'});return}
   setLicenseState({status:'ready',tier:result.tier==='plus'?'plus':'trial',reason:null});
  }
  async function activateFromUrl(url){
   const token=extractActivationToken(url);
   if(!token)return false;
   if(mounted)setLicenseState({status:'checking',tier:'trial',reason:null});
   const result=await activateOfficialInstall({activationToken:token,appVersion:APP_VERSION,appVariant:APP_VARIANT});
   await applyResult(result);
   return true;
  }
  (async()=>{
   try{
    const initialUrl=await Linking.getInitialURL();
    if(await activateFromUrl(initialUrl))return;
    await applyResult(await verifyEntitlement({appVersion:APP_VERSION,appVariant:APP_VARIANT}));
   }catch(e){if(mounted)setLicenseState({status:'blocked',tier:'trial',reason:'license_check_failed'})}
  })();
  const subscription=Linking.addEventListener('url',({url})=>{activateFromUrl(url).catch(()=>{if(mounted)setLicenseState({status:'blocked',tier:'trial',reason:'activation_failed'})})});
  return()=>{mounted=false;subscription?.remove?.()};
 },[]);

 async function openOfficialActivation(){
  try{
   const url=await getOfficialActivationUrl();
   if(url&&await Linking.canOpenURL(url)){await Linking.openURL(url);return}
   Alert.alert('التفعيل الرسمي','لم يتم ضبط رابط التفعيل الرسمي بعد. فعّل EXPO_PUBLIC_OFFICIAL_PORTAL_URL قبل إصدار النسخة العامة.');
  }catch(e){Alert.alert('تعذر فتح التفعيل','حاول مرة أخرى بعد التأكد من اتصال الإنترنت.')}
 }

 if(licenseState.status==='checking')return <View style={{flex:1,backgroundColor:'#020b12',alignItems:'center',justifyContent:'center',padding:28}}><Text style={{color:'#f4bb52',fontSize:20,fontWeight:'900',textAlign:'center'}}>الأفق</Text><Text style={{color:'#c8d3da',fontSize:13,marginTop:10,textAlign:'center'}}>جاري التحقق من النسخة الرسمية…</Text></View>;
 if(licenseState.status!=='ready')return <View style={{flex:1,backgroundColor:'#020b12',alignItems:'center',justifyContent:'center',padding:28}}><Text style={{color:'#f4bb52',fontSize:20,fontWeight:'900',textAlign:'center'}}>{licenseState.status==='plus_required'?'الأفق Plus غير مفعّل':'هذه النسخة تحتاج تفعيلًا رسميًا'}</Text><Text style={{color:'#c8d3da',fontSize:13,lineHeight:22,marginTop:12,textAlign:'center'}}>{licenseState.status==='plus_required'?'هذه نسخة Plus ولا تعمل على هذا الجهاز إلا إذا كان اشتراك Plus فعالًا ومؤكدًا.':'نسخ ملف APK إلى هاتف آخر لا ينقل ترخيص الاستخدام. فعّل هذا الجهاز من قناة الأفق الرسمية.'}</Text><Pressable onPress={openOfficialActivation} style={{marginTop:20,minHeight:46,paddingHorizontal:18,borderRadius:12,backgroundColor:'#efb44d',alignItems:'center',justifyContent:'center'}}><Text style={{color:'#111820',fontWeight:'900'}}>التفعيل من المصدر الرسمي</Text></Pressable></View>;
 return <AlofoKApp licenseTier={licenseState.tier}/>;
}

export default AlofoKLicenseGate;
'''

if "export default function App(){" in app:
    raise SystemExit('old default App export still present')
if "const IS_PLUS=APP_VARIANT==='paid';" in app:
    raise SystemExit('old unlicensed Plus switch still present')
if "const UPDATE_MANIFEST_URL='https://raw.githubusercontent.com/1984w18m11-byte/alofok-app/main/update.json';" in app:
    raise SystemExit('old single update manifest still present')
if "export default AlofoKLicenseGate;" not in app:
    raise SystemExit('license gate was not appended')
if "verifyEntitlement({appVersion:APP_VERSION,appVariant:APP_VARIANT})" not in app:
    raise SystemExit('license-aware update check missing')

app_path.write_text(app)
print('AlofoK device-bound licensing and split update channels applied successfully.')
