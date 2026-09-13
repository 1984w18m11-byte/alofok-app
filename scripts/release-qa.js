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
assert(app.includes("Automatic rotation by time, week, month and season"),'automatic theme rotation label missing');
assert(app.includes('weekInLunarMonth')&&app.includes('lunarThemeIndex')&&app.includes('seasonAtlasIndex'),'theme auto rotation logic incomplete');
assert(app.includes('<AtlasThemePreview index={index}/>'),'theme previews must use real atlas crops');
assert(app.includes("{!IS_PLUS&&<View pointerEvents='none' style={[s.themeSky"),'Plus themes must not be masked by the generic crescent overlay');
const themeMatch=app.match(/const THEME_CHOICES=\[([\s\S]*?)\];/);
assert(themeMatch,'THEME_CHOICES missing');
if(themeMatch){
  const indexes=[...themeMatch[1].matchAll(/,\s*(\d+)\]/g)].map(m=>Number(m[1]));
  const uniq=new Set(indexes);
  assert(indexes.length===28,'expected 28 concrete theme atlas entries');
  assert(uniq.size===28,'theme atlas indexes must be unique');
  assert(Math.min(...indexes)===0&&Math.max(...indexes)===27,'theme atlas indexes must cover 0..27');
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
assert(app.includes('300 solar years × 365 days = 109,500 days.'),'Cave verse calculation missing from English research section');
assert(app.includes("Support AlofoK development"),'bilingual support menu missing');
assert(!app.includes('<View style={s.supportQuickWrap}>'),'large home support block must remain removed');
if(process.exitCode){process.exit(process.exitCode)}
console.log('Release QA passed for',version);
