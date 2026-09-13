from pathlib import Path
import re

ROOT=Path('.')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'{label}: expected source fragment not found')
    return text.replace(old,new,1)

# ---------------- App.js: source-only repairs ----------------
p=ROOT/'App.js'
app=p.read_text(encoding='utf-8')

if "const SCREEN=Dimensions.get('window');" not in app:
    app=replace_once(app,"const fmtPct=x=>`${Math.round(x*100)}%`;","const fmtPct=x=>`${Math.round(x*100)}%`;\nconst SCREEN=Dimensions.get('window');",'restore SCREEN constant')

# Non-English locale selection must not show an Arabic-only confirmation.
old="async function chooseAppLanguage(id){setAppLanguage(id);setShowLanguageChoices(false);try{await AsyncStorage.setItem('alofq_app_language',id)}catch(e){console.log('Language save error:',e)}const isEnglish=String(id).startsWith('en');Alert.alert(isEnglish?'App language':'لغة التطبيق',isEnglish?'Language saved. The interface changes immediately.':'تم حفظ اللغة، وستتغير الواجهة مباشرة.')}"
new="async function chooseAppLanguage(id){setAppLanguage(id);setShowLanguageChoices(false);try{await AsyncStorage.setItem('alofq_app_language',id)}catch(e){console.log('Language save error:',e)}}"
app=replace_once(app,old,new,'language confirmation cleanup')

# Empty AsyncStorage values must not become Number('') === 0 and restore location as 0,0.
old="""    const savedCity=cities.find(x=>x.id===cityId);
    const lat=Number(savedLat),lon=Number(savedLon),accuracy=Number(savedAccuracy);
    if(savedCity)setCity(savedCity);
    if(Number.isFinite(lat)&&Number.isFinite(lon)){"""
new="""    const savedCity=cities.find(x=>x.id===cityId);
    const lat=Number(savedLat),lon=Number(savedLon),accuracy=Number(savedAccuracy);
    const hasStoredGps=Boolean(savedLat&&savedLon)&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
    if(savedCity)setCity(savedCity);
    if(hasStoredGps){"""
app=replace_once(app,old,new,'saved GPS 0,0 guard')

# Trial has exactly one fixed current Ramadan theme. Plus keeps the full standalone collection.
app=replace_once(app,"'trial-fixed':require('./assets/themes/trial-fixed.jpg'),","'trial-fixed':require('./assets/themes/month-ramadan.jpg'),",'trial Ramadan background')
app=replace_once(app,"['auto-time','تلقائي حسب الوقت ويوم الأسبوع والفصل'],","['auto-time','تلقائي حسب الوقت والتاريخ واليوم والأسبوع والشهر والفصل والسنة'],",'Arabic auto-theme label')
app=replace_once(app,'"auto-time":"Automatic: time + weekday + season"','"auto-time":"Automatic: time + date + weekday + month + season + year"','English auto-theme label')
app=replace_once(app,"const availableThemes=IS_PLUS?THEME_CHOICES:[['trial-fixed','الثيم الثابت']];","const availableThemes=IS_PLUS?THEME_CHOICES:[['trial-fixed','ثيم رمضان الثابت']];",'trial theme label')
app=replace_once(app,"ui('الثيم الليلي متاح مجاناً. بقية الثيمات ضمن الأفق بلس.','The night theme is available for free. Other themes are included with AlofoK Plus.')","ui('النسخة التجريبية تستخدم ثيم رمضان ثابتًا واحدًا. الثيمات المتغيرة والاختيار اليدوي ضمن الأفق Plus.','The trial edition uses one fixed Ramadan theme. Automatic rotation and manual theme selection are AlofoK Plus features.')",'trial theme description')

old_auto=""" const autoHour=now.getHours();
 const timeThemeId=autoHour>=5&&autoHour<8?'dawn':autoHour<11?'morning':autoHour<17?'midday':autoHour<20?'evening':'night';
 const weekdayThemeId=['week-sunday','week-monday','week-tuesday','week-wednesday','week-thursday','week-friday','week-saturday'][now.getDay()]||'week-sunday';
 const gregorianMonth=now.getMonth();
 const seasonThemeId=(gregorianMonth===2||gregorianMonth===3||gregorianMonth===4)?'spring':(gregorianMonth===5||gregorianMonth===6||gregorianMonth===7)?'summer':(gregorianMonth===8||gregorianMonth===9||gregorianMonth===10)?'autumn':'winter';
 const autoModeSlot=Math.floor(autoHour/3)%3;
 const autoThemeId=(autoHour<6||autoHour>=20)?timeThemeId:(autoModeSlot===0?timeThemeId:autoModeSlot===1?weekdayThemeId:seasonThemeId);
 const activeThemeId=selectedTheme==='auto-time'?autoThemeId:selectedTheme;"""
new_auto=""" const autoHour=now.getHours();
 const timeThemeId=autoHour>=5&&autoHour<8?'dawn':autoHour<11?'morning':autoHour<17?'midday':autoHour<20?'evening':'night';
 const weekdayThemeId=['week-sunday','week-monday','week-tuesday','week-wednesday','week-thursday','week-friday','week-saturday'][now.getDay()]||'week-sunday';
 const lunarMonthThemeId=['muharram','safar','rabi1','rabi2','jumada1','jumada2','rajab','shaban','ramadan','shawwal','dhulqida','dhulhijja'][Math.max(0,Math.min(11,(lunar.month||1)-1))]||'ramadan';
 const gregorianMonth=now.getMonth();
 const gregorianDay=now.getDate();
 const seasonThemeId=(gregorianMonth===2||gregorianMonth===3||gregorianMonth===4)?'spring':(gregorianMonth===5||gregorianMonth===6||gregorianMonth===7)?'summer':(gregorianMonth===8||gregorianMonth===9||gregorianMonth===10)?'autumn':'winter';
 const specialThemeId=(gregorianMonth===0&&gregorianDay===1)?'new-year':((gregorianMonth===5&&gregorianDay===21)?'summer-solstice':((gregorianMonth===11&&gregorianDay===21)?'winter-solstice':(((gregorianMonth===2&&gregorianDay===20)||(gregorianMonth===8&&gregorianDay===22))?'equinox':null)));
 const yearThemeOffset=Math.abs((now.getFullYear()+(lunar.year||0))%4);
 const dateThemeSlot=(Math.floor(((lunar.day||1)-1)/2)+yearThemeOffset)%4;
 const rotatingThemeId=[timeThemeId,weekdayThemeId,lunarMonthThemeId,seasonThemeId][dateThemeSlot];
 const autoThemeId=specialThemeId||((autoHour<6||autoHour>=20)?timeThemeId:rotatingThemeId);
 const activeThemeId=selectedTheme==='auto-time'?autoThemeId:selectedTheme;"""
app=replace_once(app,old_auto,new_auto,'full Plus automatic theme rotation')

# Update checker: do not report licensing/configuration errors as an Internet outage.
old_catch="""  }catch(e){
   if(showResult)Alert.alert(ui('تعذر البحث عن تحديث','Unable to check for updates'),ui('تحقق من اتصال الإنترنت ثم حاول مرة أخرى.','Check your internet connection and try again.'));
  }finally{setUpdateChecking(false)}"""
new_catch="""  }catch(e){
   const message=String(e?.message||'');
   if(showResult){
    if(message.startsWith('LICENSE_'))Alert.alert(ui('تعذر التحقق من التفعيل','Unable to verify activation'),ui('المشكلة مرتبطة بالتفعيل أو خدمة الترخيص، وليست بالضرورة من اتصال الإنترنت.','The problem is related to activation or the license service, not necessarily your Internet connection.'));
    else Alert.alert(ui('تعذر البحث عن تحديث','Unable to check for updates'),ui('تعذر الوصول إلى ملف التحديث. تحقق من الإنترنت أو حاول لاحقًا.','The update manifest could not be reached. Check your connection or try again later.'));
   }
  }finally{setUpdateChecking(false)}"""
app=replace_once(app,old_catch,new_catch,'update error classification')

p.write_text(app,encoding='utf-8')

# ---------------- license.js: free Trial, fail-closed Plus ----------------
p=ROOT/'src/services/license.js'
lic=p.read_text(encoding='utf-8')
lic=replace_once(lic,"const ENFORCEMENT_REQUIRED=process.env.EXPO_PUBLIC_LICENSE_ENFORCEMENT==='required';","const ENFORCEMENT_REQUIRED=process.env.EXPO_PUBLIC_LICENSE_ENFORCEMENT==='required';\nconst EXPLICIT_DEV_BYPASS=process.env.EXPO_PUBLIC_LICENSE_DEV_BYPASS==='1';",'license explicit bypass flag')
old="""export async function verifyEntitlement({appVersion,appVariant}){
  if(!LICENSE_API_URL){
    if(ENFORCEMENT_REQUIRED)return {valid:false,reason:'license_service_not_configured'};
    return {valid:true,tier:appVariant==='paid'?'plus':'trial',developmentBypass:true};
  }
  const installId=await getInstallId();
  const licenseToken=await AsyncStorage.getItem(LICENSE_TOKEN_KEY);
  if(!licenseToken)return {valid:false,reason:'official_activation_required'};
  try{"""
new="""export async function verifyEntitlement({appVersion,appVariant}){
  const installId=await getInstallId();
  const licenseToken=await AsyncStorage.getItem(LICENSE_TOKEN_KEY);
  if(!LICENSE_API_URL){
    if(BUILD_VARIANT==='trial')return {valid:true,tier:'trial',offlineFreeTrial:true};
    if(EXPLICIT_DEV_BYPASS&&!ENFORCEMENT_REQUIRED)return {valid:true,tier:'plus',developmentBypass:true};
    return {valid:false,reason:'license_service_not_configured'};
  }
  if(!licenseToken){
    if(BUILD_VARIANT==='trial')return {valid:true,tier:'trial',freeTrial:true};
    return {valid:false,reason:'official_activation_required'};
  }
  try{"""
lic=replace_once(lic,old,new,'license entitlement policy')
lic=lic.replace("export const licenseConfig={enforcementRequired:ENFORCEMENT_REQUIRED,packageId:PACKAGE_ID};","export const licenseConfig={enforcementRequired:ENFORCEMENT_REQUIRED,explicitDevBypass:EXPLICIT_DEV_BYPASS,packageId:PACKAGE_ID};")
p.write_text(lic,encoding='utf-8')

# ---------------- release QA: catch regressions discovered by audit ----------------
p=ROOT/'scripts/release-qa.js'
qa=p.read_text(encoding='utf-8')
qa=replace_once(qa,"assert(app.includes(\"Automatic: time + weekday + season\"),'automatic theme rotation label missing');\nassert(app.includes('weekdayThemeId')&&app.includes('seasonThemeId')&&app.includes('timeThemeId'),'standalone automatic theme rotation incomplete');",
"assert(app.includes(\"Automatic: time + date + weekday + month + season + year\"),'automatic theme rotation label missing');\nassert(app.includes('weekdayThemeId')&&app.includes('lunarMonthThemeId')&&app.includes('seasonThemeId')&&app.includes('timeThemeId')&&app.includes('yearThemeOffset')&&app.includes('specialThemeId'),'standalone automatic theme rotation incomplete');",
'QA full theme rotation')
insert="""\nassert(!app.includes('SCREEN.height')||app.includes("const SCREEN=Dimensions.get('window');"),'SCREEN must be defined before StyleSheet uses it');
assert(app.includes('const hasStoredGps=Boolean(savedLat&&savedLon)'), 'saved GPS must reject empty values instead of restoring 0,0');
assert(app.includes("'trial-fixed':require('./assets/themes/month-ramadan.jpg')"),'trial must use one fixed Ramadan theme');
assert(app.includes("const availableThemes=IS_PLUS?THEME_CHOICES:[['trial-fixed','ثيم رمضان الثابت']]"),'trial must expose exactly one fixed theme');
"""
marker="assert(!app.includes('THEME_ATLAS')&&!app.includes('AtlasTheme'),'legacy atlas code must be removed');\n"
qa=replace_once(qa,marker,marker+insert,'QA audit regressions')
p.write_text(qa,encoding='utf-8')

print('Audit source-only repairs applied. No build files or release artifacts were produced.')
