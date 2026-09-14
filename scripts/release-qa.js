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
assert(app.includes("return <View style={[s.prayerStrip,rowDir(rtl)]}>"),'prayer strip must show all six times without horizontal scrolling');
assert(app.includes("prayerItem:{flex:1,minWidth:0,minHeight:72"),'prayer items must share the available width');

assert(strings.includes("appName:'الأفق'")&&strings.includes("appName:'AlofoK'"),'Arabic and English V3 packs are required');
assert(strings.includes("languageTitle:'Interface language'")&&strings.includes("languageTitle:'لغة الواجهة'"),'language screen strings missing');
assert(app.includes('makeV3Translator(language)'),'all V3 screens must use centralized translations');
assert(app.includes('v3IsRtl(language)'),'interface direction must follow selected language');
assert(events.every(x=>Boolean(x.en)),'all religious events need English names');
for(const rows of Object.values(national))assert(rows.every(x=>Boolean(x.name_en)),'all national events need English names');

assert(strings.includes('This app is not a religious authority')&&strings.includes('هذا البرنامج ليس دينيًا'),'research disclaimer missing');
assert(strings.includes('Nasi')&&strings.includes('شهر النسيء'),'Nasi leap-month research explanation missing');
assert(!app.includes('<View style={s.supportQuickWrap}>'),'large home support block must remain removed');
assert(!app.includes('<View style={[s.dualCards,rowDir(rtl)]}>'),'mini calendar summary cards must stay removed');
assert(app.includes("import religiousEvents from '../data/events.json';")&&app.includes("import nationalEvents from '../data/national-events.json';"),'calendar event data must be wired into the app');
assert(app.includes('info.month===todayInfo.month&&info.year===todayInfo.year'),'Hijri today highlight must match day, month, and year');
assert(app.includes('country={location.country}'),'Gregorian national events must follow the selected/current country');
assert(app.includes('religiousEventsFor(info.month,day)'),'Hijri religious events must be enabled');
assert(app.includes("import {useCountryHolidays} from './useCountryHolidays';"),'global country holiday hook must be wired into calendar');
assert(app.includes('useCountryHolidays(country,year)'),'Gregorian calendar must load holidays for GPS country and visible year');
assert(app.includes("import religiousEventsExtra from '../data/religious-events-extra.json';"),'expanded religious event data must be wired into Hijri calendar');
const holidayHook=read('src/app/useCountryHolidays.js');
assert(holidayHook.includes('https://nagerholidays.com/api/v4/Holidays'),'global holiday API must remain configured');
assert(holidayHook.includes('AsyncStorage'),'country holidays must be cached for offline fallback');
assert(holidayHook.includes("code==='IQ'&&String(x.date).slice(5)==='03-16'"),'Iraq March 16 political observance must be filtered from remote holiday data');
const iraq=JSON.parse(read('src/data/iraq-observances.json'));
for(const key of ['عيد الجيش العراقي','عيد الشرطة العراقية','عيد نوروز','اليوم الوطني العراقي','يوم النصر على داعش'])assert(iraq.some(x=>x.name_ar===key),`Iraq observance missing: ${key}`);
assert(!iraq.some(x=>String(x.name_ar||'').includes('البعث')||String(x.name_en||'').toLowerCase().includes("ba'ath")),'political Baath-era commemoration must stay excluded from Iraq observances');

if(process.exitCode)process.exit(process.exitCode);
console.log('Release QA passed for AlofoK V3',version);

// Legal, privacy and authenticity verification guards
assert(app.includes("from './LegalScreens';"),'legal/authenticity screens must be wired');
assert(app.includes("screen==='copyright'")&&app.includes("screen==='authenticity'"),'copyright and authenticity routes must exist');
const legal=read('src/app/LegalScreens.js');
assert(legal.includes('سياسة الخصوصية')&&legal.includes('حقوق الطبع والنشر'),'full Arabic privacy and copyright screens required');
assert(legal.includes('react-native-qrcode-svg'),'authenticity screen must render QR codes');
const authClient=read('src/app/authenticityClient.js');
assert(authClient.includes('EXPO_PUBLIC_AUTH_API_URL')&&authClient.includes('/v1/authenticity/challenge'),'authenticity API contract missing');
assert(authClient.includes("edition,version,installationId"),'authenticity challenge must bind edition, version and installation');
const pkgLegal=JSON.parse(read('package.json'));
assert(pkgLegal.dependencies['react-native-qrcode-svg']&&pkgLegal.dependencies['react-native-svg'],'QR dependencies must be installed');
