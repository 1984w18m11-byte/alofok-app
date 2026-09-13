const fs=require('fs');
const assert=(ok,msg)=>{if(!ok){console.error('QA FAIL:',msg);process.exitCode=1}};
const read=p=>fs.readFileSync(p,'utf8');
const app=read('App.js');
const config=read('app.config.js');
const appJson=JSON.parse(read('app.json'));
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const trial=JSON.parse(read('update-trial.json'));
const plus=JSON.parse(read('update-plus.json'));
const registry=JSON.parse(read('src/data/adhan-registry.json'));
const events=JSON.parse(read('src/data/events.json'));
const national=JSON.parse(read('src/data/national-events.json'));
const version=appJson.expo.version;

assert(app.includes(`const APP_VERSION='${version}';`),'App.js version must match app.json');
assert(pkg.version===version,'package.json version mismatch');
assert(lock.version===version&&lock.packages?.['']?.version===version,'package-lock version mismatch');
assert(trial.version===version&&plus.version===version,'update manifests version mismatch');
assert(trial.versionCode===appJson.expo.android.versionCode&&plus.versionCode===appJson.expo.android.versionCode,'manifest versionCode mismatch');
assert((config.match(/const packageId =/g)||[]).length===1,'app.config.js must contain exactly one packageId declaration');
assert(config.includes("'com.alofok.plus'")&&config.includes("'com.alofok.trial'"),'trial and Plus package IDs must be distinct');
assert(app.includes("const IS_PLUS=IS_PAID_BUILD&&licenseTier==='plus';"),'Plus features must be gated by paid build + license');
assert(!app.includes("appLanguage==='system'?true:isRtlLocale"),'system language must not force RTL');
assert(app.includes("Automatic: time + date + weekday + month + season + year"),'automatic theme rotation label missing');
assert(app.includes('weekdayThemeId')&&app.includes('lunarMonthThemeId')&&app.includes('seasonThemeId')&&app.includes('timeThemeId')&&app.includes('yearThemeOffset')&&app.includes('specialThemeId'),'standalone automatic theme rotation incomplete');
assert(app.includes('<ThemePreview themeId={id}/>'),'theme previews must use standalone image files');
assert(app.includes("<ThemeBackground themeId={IS_PLUS?activeThemeId:'trial-fixed'}/>"),'fixed trial / automatic Plus background binding missing');
assert(!app.includes('THEME_ATLAS')&&!app.includes('AtlasTheme'),'legacy atlas code must be removed');

assert(!app.includes('SCREEN.height')||app.includes("const SCREEN=Dimensions.get('window');"),'SCREEN must be defined before StyleSheet uses it');
assert(app.includes('const hasStoredGps=Boolean(savedLat&&savedLon)'), 'saved GPS must reject empty values instead of restoring 0,0');
assert(app.includes("'trial-fixed':require('./assets/themes/month-ramadan.jpg')"),'trial must use one fixed Ramadan theme');
assert(app.includes("const availableThemes=IS_PLUS?THEME_CHOICES:[['trial-fixed','ثيم رمضان الثابت']]"),'trial must expose exactly one fixed theme');
assert(!fs.existsSync('assets/themes/alofok-plus-theme-atlas-v1.jpg'),'legacy atlas file must be deleted');
const themeMatch=app.match(/const THEME_CHOICES=\[([\s\S]*?)\];/);
assert(themeMatch,'THEME_CHOICES missing');
if(themeMatch){
  const ids=[...themeMatch[1].matchAll(/\['([^']+)'/g)].map(m=>m[1]);
  assert(ids.length===35,'expected auto + 34 Plus theme choices');
  assert(new Set(ids).size===35,'theme ids must be unique');
}
const configuredSounds=(appJson.expo.plugins.find(x=>Array.isArray(x)&&x[0]==='expo-notifications')||[])[1]?.sounds||[];
assert(configuredSounds.length===4,'four notification Adhan sounds must be configured');
assert(configuredSounds.every(x=>x.endsWith('.wav')),'notification sounds should use WAV');
const playable=registry.filter(x=>x.status==='licensed'&&Array.isArray(x.available_in)&&x.available_in.length);
assert(playable.length>=4,'expected at least four licensed playable Adhan entries');
for(const x of playable){
  assert(Boolean(x.license),`${x.id}: license missing`);
  assert(Boolean(x.source),`${x.id}: source missing`);
  assert(Boolean(x.source_url),`${x.id}: source URL missing`);
  assert(Boolean(x.asset),`${x.id}: asset path missing`);
  assert(x.available_in.includes('trial')&&x.available_in.includes('paid'),`${x.id}: must be enabled in both editions`);
  assert(app.includes(`'${x.id}':require(`),`${x.id}: preview asset not bundled in App.js`);
  assert(app.includes(`'${x.id}':'`)&&app.includes('.wav'),`${x.id}: notification sound map missing`);
}
assert(events.every(x=>Boolean(x.en)),'all religious events need English names');
for(const rows of Object.values(national)) assert(rows.every(x=>Boolean(x.name_en)),'all national events need English names');
assert(app.includes("clockLanguage:useArabicUi?'ar':'en'"),'prayer time AM/PM language switch missing');
assert(app.includes("const horizonDays=Platform.OS==='ios'?7:14;"),'prayer and fasting notifications must be pre-scheduled beyond the current day');
const licenseSource=read('src/services/license.js');
assert(licenseSource.includes("return {valid:false,reason:'license_service_not_configured'}"),'Plus must fail closed when the license service is absent');
assert(app.includes('300 solar years × 365 days = 109,500 days.'),'Cave verse calculation missing from English research section');
assert(app.includes("Support AlofoK development"),'bilingual support menu missing');
assert(!app.includes('<View style={s.supportQuickWrap}>'),'large home support block must remain removed');
if(process.exitCode){process.exit(process.exitCode)}
console.log('Release QA passed for',version);
