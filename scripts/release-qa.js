const fs=require('fs');
const assert=(ok,msg)=>{if(!ok){console.error('QA FAIL:',msg);process.exitCode=1}};
const read=p=>fs.readFileSync(p,'utf8');
const entry=read('App.js');
const app=read('src/app/AppV3.js');
const themes=read('src/app/themeCatalog.js');
const adhans=read('src/app/adhanCatalog.js');
const gps=read('src/app/useDeviceLocation.js');
const strings=read('src/app/v3Strings.js');
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

assert(entry.includes("import AppV3 from './src/app/AppV3'"),'App.js must use the modular V3 entry');
assert(app.includes(`const VERSION='${version}';`),'V3 version must match app.json');
assert(pkg.version===version,'package.json version mismatch');
assert(lock.version===version&&lock.packages?.['']?.version===version,'package-lock version mismatch');
assert(trial.version===version&&plus.version===version,'update manifests version mismatch');
assert(trial.versionCode===appJson.expo.android.versionCode&&plus.versionCode===appJson.expo.android.versionCode,'manifest versionCode mismatch');
assert((config.match(/const packageId =/g)||[]).length===1,'app.config.js must contain exactly one packageId declaration');
assert(config.includes("'com.alofok.plus'")&&config.includes("'com.alofok.trial'"),'trial and Plus package IDs must be distinct');
assert(config.includes("isPaid ? './assets/icon-paid.png' : './assets/icon-trial.png'"),'Trial and Plus must use their approved full launcher icons');
assert(!config.includes('adaptiveIcon'),'do not wrap full launcher artwork inside adaptiveIcon; it causes the icon to render too small');

assert(app.includes("const IS_PLUS=process.env.EXPO_PUBLIC_APP_VARIANT==='paid';"),'Plus features must be gated by paid build variant');
assert(app.includes("if(!IS_PLUS&&id!=='trial-fixed')"),'trial build must reject Plus theme selection');
assert(app.includes("if(!IS_PLUS)return HOME_REFERENCE_BACKGROUND"),'trial home background must stay fixed');
assert(app.includes('automaticThemeId(now)'),'Plus automatic theme rotation missing');
assert(!app.includes('THEME_ATLAS')&&!themes.includes('THEME_ATLAS'),'legacy atlas code must stay removed');
assert(!fs.existsSync('assets/themes/alofok-plus-theme-atlas-v1.jpg'),'legacy atlas file must stay deleted');
const standaloneThemeRequires=[...themes.matchAll(/require\('\.\.\/\.\.\/assets\/themes\/([^']+)'\)/g)].map(x=>x[1]);
assert(standaloneThemeRequires.length===35,'expected 35 standalone theme images including fixed trial theme');
assert(new Set(standaloneThemeRequires).size===35,'standalone theme image paths must be unique');
for(const name of standaloneThemeRequires)assert(fs.existsSync(`assets/themes/${name}`),`missing theme asset: ${name}`);

const configuredSounds=(appJson.expo.plugins.find(x=>Array.isArray(x)&&x[0]==='expo-notifications')||[])[1]?.sounds||[];
assert(configuredSounds.length===6,'six notification Adhan sounds must be configured');
assert(configuredSounds.every(x=>x.endsWith('.wav')),'notification sounds should use WAV');
const playable=registry.filter(x=>x.status==='licensed'&&Array.isArray(x.available_in)&&x.available_in.length);
assert(playable.length===6,'expected exactly six licensed playable Adhan entries');
const rejectedIds=['commons-morocco-hassan-ii','commons-kazakhstan-shalqar','commons-aaqib-azeez','commons-mecca-maghrib-2012','commons-konya-2012','commons-tripoli-2019','commons-isfahan-shah'];
assert(!registry.some(x=>rejectedIds.includes(x.id)),'rejected Adhan ids must stay removed');
for(const id of rejectedIds)assert(!adhans.includes(`'${id}'`),`${id}: rejected Adhan must not be bundled`);
for(const x of playable){
 assert(Boolean(x.license),`${x.id}: license missing`);
 assert(Boolean(x.source),`${x.id}: source missing`);
 assert(Boolean(x.source_url),`${x.id}: source URL missing`);
 assert(Boolean(x.asset),`${x.id}: asset path missing`);
 assert(x.available_in.includes('trial')&&x.available_in.includes('paid'),`${x.id}: must be enabled in both editions`);
 assert(adhans.includes(`'${x.id}':require(`),`${x.id}: preview asset not bundled in adhanCatalog.js`);
 assert(adhans.includes(`'${x.id}':'`)&&adhans.includes('.wav'),`${x.id}: notification sound map missing`);
}

assert(gps.includes('Location.Accuracy.Highest'),'GPS must request highest available accuracy');
assert(gps.includes('watchPositionAsync'),'GPS must briefly watch for a better fix');
assert(gps.includes('nearestCity'),'GPS label must support nearest seeded locality');
assert(app.includes("calculatePrayerTimes({date:civilDate,lat:location.lat,lon:location.lon"),'prayer times must use current coordinates');
assert(app.includes("method:'MWL'"),'MWL prayer calculation default missing');
assert(app.includes('schedulePrayerAlerts'),'background prayer notification scheduling missing');

assert(strings.includes("appName:'الأفق'")&&strings.includes("appName:'AlofoK'"),'Arabic and English V3 packs are required');
assert(strings.includes("languageTitle:'Interface language'")&&strings.includes("languageTitle:'لغة الواجهة'"),'language screen strings missing');
assert(app.includes('makeV3Translator(language)'),'all V3 screens must use centralized translations');
assert(app.includes('v3IsRtl(language)'),'interface direction must follow selected language');
assert(events.every(x=>Boolean(x.en)),'all religious events need English names');
for(const rows of Object.values(national))assert(rows.every(x=>Boolean(x.name_en)),'all national events need English names');

assert(strings.includes('This app is not a religious authority')&&strings.includes('هذا البرنامج ليس دينيًا'),'research disclaimer missing');
assert(strings.includes('Nasi')&&strings.includes('شهر النسيء'),'Nasi leap-month research explanation missing');
assert(!app.includes('<View style={s.supportQuickWrap}>'),'large home support block must remain removed');

if(process.exitCode)process.exit(process.exitCode);
console.log('Release QA passed for AlofoK V3',version);
