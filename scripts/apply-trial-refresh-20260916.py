from pathlib import Path
import json, re

ROOT=Path('.')

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing patch target: {label}')
    return text.replace(old,new)

# 1) Restore the six previously approved Trial Adhan voices while leaving Plus' current premium set intact.
registry=[
 {"id":"commons-beautiful-adhan","country":"*","city":"*","display_ar":"أذان جميل — Adam-synagda","performer":"Adam-synagda","status":"licensed","license_required":False,"license":"CC0 1.0 Universal","source":"Wikimedia Commons — Beautiful adhan.ogg","source_url":"https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg","asset":"assets/adhan/beautiful_adhan.ogg","available_in":["trial","paid"]},
 {"id":"commons-andrewler-azan","country":"*","city":"*","display_ar":"أذان — Andrewler","performer":"Andrewler","status":"licensed","license_required":True,"license":"CC BY-SA 4.0","source":"Wikimedia Commons — Azan.ogg","source_url":"https://commons.wikimedia.org/wiki/File:Azan.ogg","asset":"assets/adhan/adhan_andrewler.ogg","available_in":["trial","paid"]},
 {"id":"commons-aishatu98-adhan","country":"*","city":"*","display_ar":"أذان — Aishatu98","performer":"Aishatu98","status":"licensed","license_required":False,"license":"CC0 1.0 Universal","source":"Wikimedia Commons — Adhan.ogg","source_url":"https://commons.wikimedia.org/wiki/File:Adhan.ogg","asset":"assets/adhan/adhan_aishatu98.ogg","available_in":["trial"]},
 {"id":"commons-nigeria-isaac","country":"NG","city":"*","display_ar":"أذان نيجيريا — Isaacayodele32","performer":"Isaacayodele32","status":"licensed","license_required":True,"license":"CC BY-SA 4.0","source":"Wikimedia Commons — Call to prayer.ogg","source_url":"https://commons.wikimedia.org/wiki/File:Call_to_prayer.ogg","asset":"assets/adhan/adhan_nigeria_isaac.ogg","available_in":["trial"]},
 {"id":"commons-medina-ejaz215","country":"SA","city":"Medina","display_ar":"أذان المدينة — المسجد النبوي","performer":"ejaz215","status":"licensed","license_required":True,"license":"CC BY 3.0","source":"Wikimedia Commons — call to prayer from the Prophet's Mosque","source_url":"https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg","asset":"assets/adhan/adhan_medina_ejaz215.ogg","available_in":["trial"]},
 {"id":"commons-mecca-2013","country":"SA","city":"Mecca","display_ar":"أذان مكة — المسجد الحرام 2013","performer":"Seyfula Islam","status":"licensed","license_required":True,"license":"CC BY 3.0","source":"Wikimedia Commons — Adhan, Great Mosque of Mecca - Jan 21, 2013.webm","source_url":"https://commons.wikimedia.org/wiki/File:Adhan,_Great_Mosque_of_Mecca_-_Jan_21,_2013.webm","asset":"assets/adhan/adhan_mecca_2013.ogg","available_in":["trial"]},
 {"id":"commons-maahur-saeed","country":"IR","city":"*","display_ar":"أذان مقام ماهور — سعيد حاتم زاده","performer":"Saeed Hatamzadeh-Varmazyar","status":"licensed","license_required":True,"license":"CC BY-SA 4.0","source":"Wikimedia Commons — AzaanMaahur.ogg","source_url":"https://commons.wikimedia.org/wiki/File:AzaanMaahur.ogg","asset":"assets/adhan/adhan_maahur.ogg","available_in":["paid"]}
]
write('src/data/adhan-registry.json',json.dumps(registry,ensure_ascii=False,indent=2)+'\n')

adhan_catalog="""import registry from '../data/adhan-registry.json';

const ASSETS={
 'commons-beautiful-adhan':require('../../assets/adhan/beautiful_adhan.ogg'),
 'commons-andrewler-azan':require('../../assets/adhan/adhan_andrewler.ogg'),
 'commons-aishatu98-adhan':require('../../assets/adhan/adhan_aishatu98.ogg'),
 'commons-nigeria-isaac':require('../../assets/adhan/adhan_nigeria_isaac.ogg'),
 'commons-medina-ejaz215':require('../../assets/adhan/adhan_medina_ejaz215.ogg'),
 'commons-mecca-2013':require('../../assets/adhan/adhan_mecca_2013.ogg'),
 'commons-maahur-saeed':require('../../assets/adhan/adhan_maahur.ogg')
};

const NOTIFICATION_SOUNDS={
 'commons-beautiful-adhan':'beautiful_adhan.wav',
 'commons-andrewler-azan':'adhan_andrewler.wav',
 'commons-aishatu98-adhan':'adhan_aishatu98.wav',
 'commons-nigeria-isaac':'adhan_nigeria_isaac.wav',
 'commons-medina-ejaz215':'adhan_medina_ejaz215.wav',
 'commons-mecca-2013':'adhan_mecca_2013.wav',
 'commons-maahur-saeed':'adhan_maahur.wav'
};

const ENGLISH_NAMES={
 'commons-beautiful-adhan':'Beautiful Adhan — Adam-synagda',
 'commons-andrewler-azan':'Adhan — Andrewler',
 'commons-aishatu98-adhan':'Adhan — Aishatu98',
 'commons-nigeria-isaac':'Nigeria Adhan — Isaacayodele32',
 'commons-medina-ejaz215':'Medina Adhan — Prophet’s Mosque recording',
 'commons-mecca-2013':'Mecca Adhan — Grand Mosque 2013',
 'commons-maahur-saeed':'Mahur-mode Adhan — Saeed Hatamzadeh-Varmazyar'
};

export const ADHAN_CATALOG=registry
 .filter(item=>item.status==='licensed'&&ASSETS[item.id])
 .map(item=>({...item,display_en:ENGLISH_NAMES[item.id]||item.performer||'Adhan',audio:ASSETS[item.id],notificationSound:NOTIFICATION_SOUNDS[item.id]}));

export const ADHAN_BY_ID=Object.fromEntries(ADHAN_CATALOG.map(x=>[x.id,x]));
export const DEFAULT_ADHAN_ID=ADHAN_CATALOG[0]?.id||null;

export function availableAdhanForVariant(isPlus){
 const variant=isPlus?'paid':'trial';
 return ADHAN_CATALOG.filter(x=>!x.available_in||x.available_in.includes(variant));
}
"""
write('src/app/adhanCatalog.js',adhan_catalog)

# 2) Notification sound bundles: six restored Trial sounds; preserve current three Plus sounds.
config=read('app.config.js')
config=re.sub(r"  const trialSounds = \[[^\n]+\];\n  const paidSounds = \[[^\n]+\];",
"  const trialSounds = [\n    './assets/adhan/beautiful_adhan.wav',\n    './assets/adhan/adhan_andrewler.wav',\n    './assets/adhan/adhan_aishatu98.wav',\n    './assets/adhan/adhan_nigeria_isaac.wav',\n    './assets/adhan/adhan_medina_ejaz215.wav',\n    './assets/adhan/adhan_mecca_2013.wav'\n  ];\n  const paidSounds = ['./assets/adhan/beautiful_adhan.wav', './assets/adhan/adhan_andrewler.wav', './assets/adhan/adhan_maahur.wav'];",config)
write('app.config.js',config)

# 3) Make only the four existing seasonal Plus images selectable in Trial.
themes=read('src/app/themeCatalog.js')
for season in ['spring','summer','autumn','winter']:
    themes=themes.replace(f"id:'season-{season}',group:'seasons',labelKey:'{season}',plus:true",f"id:'season-{season}',group:'seasons',labelKey:'{season}',plus:false")
write('src/app/themeCatalog.js',themes)

# 4) Wire Trial activation screen and seasonal theme behavior.
app=read('src/app/AppV3.js')
app=must_replace(app,"import {AdvertiseScreen,TrialAdOverlay,useTrialAd} from './TrialAds';","import {AdvertiseScreen,TrialAdOverlay,useTrialAd} from './TrialAds';\nimport {TrialPlusActivation} from './TrialPlusActivation';",'activation import')
app=must_replace(app," const themes=THEME_CATALOG.filter(x=>x.group===group&&(isPlus||!x.plus));"," const groups=isPlus?GROUP_ORDER:['seasons'];\n const themes=THEME_CATALOG.filter(x=>x.group===group&&(isPlus||!x.plus));",'trial theme groups')
app=must_replace(app,"{GROUP_ORDER.map(g=><Pressable","{groups.map(g=><Pressable",'theme tabs')
app=app.replace("  {!isPlus&&<View style={s.plusGate}><Text style={[s.note,textDir(rtl)]}>{t('plusOnly')}</Text></View>}\n","")
old_plus=re.search(r"function PlusScreen\(\{t,rtl,isPlus,onBack\}\)\{.*?\n\}\n\nfunction LanguageScreen",app,re.S)
if not old_plus: raise SystemExit('missing PlusScreen block')
new_plus="""function PlusScreen({t,rtl,isPlus,country,onBack}){
 if(!isPlus)return <TrialPlusActivation t={t} rtl={rtl} country={country} onBack={onBack}/>;
 const plus=[t('plusAllFree'),t('plusThemes'),t('plusAdhan'),t('plusSeasons'),t('plusSupport')];
 return <SafeAreaView style={s.flatSafe}><ScrollView contentContainerStyle={s.screenContent}>
  <Header title={t('chooseExperience')} t={t} rtl={rtl} onBack={onBack}/>
  <View style={s.plusPlan}><Text style={s.crown}>♛</Text><Text style={[s.planTitle,{color:GOLD}]}>{t('plus')}</Text><Text style={s.planSubtitle}>{t('plusExperience')}</Text>{plus.map(x=><CheckRow key={x} text={x} rtl={rtl} gold/>)}<View style={s.currentPlanButton}><Text style={s.currentPlanText}>{t('currentPlan')}</Text></View></View>
 </ScrollView></SafeAreaView>
}

function LanguageScreen"""
app=app[:old_plus.start()]+new_plus+app[old_plus.end():]
app=must_replace(app," const [selectedTheme,setSelectedThemeState]=useState(IS_PLUS?'auto':'trial-fixed');"," const [selectedTheme,setSelectedThemeState]=useState(IS_PLUS?'auto':'season-autumn');",'trial default theme')
app=must_replace(app,"  if(!IS_PLUS&&id!=='trial-fixed'){setScreenHistory(history=>[...history,'themes']);setScreen('plus');return}","  if(!IS_PLUS&&!['season-spring','season-summer','season-autumn','season-winter'].includes(id)){setScreenHistory(history=>[...history,'themes']);setScreen('plus');return}",'trial theme guard')
app=must_replace(app,"  if(!IS_PLUS)return HOME_REFERENCE_BACKGROUND;","  if(!IS_PLUS)return THEME_BY_ID[selectedTheme]?.image||THEME_BY_ID['season-autumn']?.image||HOME_REFERENCE_BACKGROUND;",'trial theme source')
app=must_replace(app," if(screen==='plus')return <PlusScreen t={t} rtl={rtl} isPlus={IS_PLUS} onBack={goBack}/>;"," if(screen==='plus')return <PlusScreen t={t} rtl={rtl} isPlus={IS_PLUS} country={location.country} onBack={goBack}/>;",'plus route country')
write('src/app/AppV3.js',app)

# 5) Add owner/copyright identity to privacy and IP screens.
legal=read('src/app/LegalScreens.js')
legal=must_replace(legal,"الأفق / AlofoK مشروع تقويمي وتقني وبحثي، وليس جهة دينية رسمية. تعرض النسختان التجريبية وPlus التقويمات والمواقيت والمناسبات والخدمات المرتبطة بها بحسب الميزات المتاحة في كل نسخة.","الأفق / AlofoK مشروع تقويمي وتقني وبحثي، وليس جهة دينية رسمية. صاحب المشروع وحقوقه الأصلية: وسام محمد — Wissam Digital. تعرض النسختان التجريبية وPlus التقويمات والمواقيت والمناسبات والخدمات المرتبطة بها بحسب الميزات المتاحة في كل نسخة.",'privacy owner ar')
legal=must_replace(legal,"AlofoK is a calendar, technology and research project, not an official religious authority. Trial and Plus provide calendars, prayer times, events and related services according to the features available in each edition.","AlofoK is a calendar, technology and research project, not an official religious authority. Project owner and original-rights notice: Wissam Mohammed — Wissam Digital. Trial and Plus provide calendars, prayer times, events and related services according to the features available in each edition.",'privacy owner en')
legal=must_replace(legal,"© AlofoK / الأفق. جميع الحقوق محفوظة في الشفرة البرمجية الأصلية، تصميم الواجهات، الشعارات والأيقونات الأصلية، ترتيب المحتوى، النصوص والمواد التي أُنشئت خصيصًا للمشروع، وذلك إلى الحد الذي يسمح به القانون.","© 2026 وسام محمد — Wissam Digital — AlofoK / الأفق. جميع حقوق الطبع والنشر والملكية الفكرية محفوظة في الشفرة البرمجية الأصلية، تصميم الواجهات، الشعارات والأيقونات الأصلية، ترتيب المحتوى، النصوص والمواد التي أُنشئت خصيصًا للمشروع، وذلك إلى الحد الذي يسمح به القانون.",'copyright owner ar')
legal=must_replace(legal,"© AlofoK. All rights are reserved in the original source code, interface design, original logos and icons, content arrangement, text and materials created specifically for the project, to the extent permitted by law.","© 2026 Wissam Mohammed — Wissam Digital — AlofoK. Copyright and intellectual-property rights are reserved in the original source code, interface design, original logos and icons, content arrangement, text and materials created specifically for the project, to the extent permitted by law.",'copyright owner en')
write('src/app/LegalScreens.js',legal)

# 6) Update release QA to the new Trial contract.
qa=read('scripts/release-qa.js')
qa=must_replace(qa,"assert(app.includes(\"if(!IS_PLUS&&id!=='trial-fixed')\"),'trial build must reject Plus theme selection');","assert(app.includes(\"['season-spring','season-summer','season-autumn','season-winter'].includes(id)\"),'trial build must allow only the four seasonal themes');",'qa theme guard')
qa=must_replace(qa,"assert(app.includes(\"if(!IS_PLUS)return HOME_REFERENCE_BACKGROUND\"),'trial home background must stay fixed');","assert(app.includes(\"if(!IS_PLUS)return THEME_BY_ID[selectedTheme]?.image\"),'trial home background must use the selected seasonal theme');",'qa theme source')
start=qa.index("const configuredBaseSounds=")
end=qa.index("assert(adhanHook.includes('availableAdhanForVariant')",start)
new_sound_qa="""const configuredBaseSounds=(appJson.expo.plugins.find(x=>Array.isArray(x)&&x[0]==='expo-notifications')||[])[1]?.sounds||[];
assert(configuredBaseSounds.length===1&&configuredBaseSounds[0].endsWith('beautiful_adhan.wav'),'base app.json config keeps the stable fallback Adhan');
for(const name of ['beautiful_adhan.wav','adhan_andrewler.wav','adhan_aishatu98.wav','adhan_nigeria_isaac.wav','adhan_medina_ejaz215.wav','adhan_mecca_2013.wav'])assert(config.includes(`'./assets/adhan/${name}'`),`Trial notification sound missing: ${name}`);
assert(config.includes("const paidSounds = ['./assets/adhan/beautiful_adhan.wav', './assets/adhan/adhan_andrewler.wav', './assets/adhan/adhan_maahur.wav']"),'Plus notification set must remain unchanged');
const playable=registry.filter(x=>x.status==='licensed'&&Array.isArray(x.available_in)&&x.available_in.length);
const trialPlayable=playable.filter(x=>x.available_in.includes('trial'));
const plusPlayable=playable.filter(x=>x.available_in.includes('paid'));
assert(playable.length===7,'expected six restored Trial voices plus the existing Plus-only Mahur voice');
assert(trialPlayable.length===6,'Trial must expose exactly the six restored approved Adhan voices');
for(const id of ['commons-beautiful-adhan','commons-andrewler-azan','commons-aishatu98-adhan','commons-nigeria-isaac','commons-medina-ejaz215','commons-mecca-2013'])assert(trialPlayable.some(x=>x.id===id),`restored Trial Adhan missing: ${id}`);
assert(plusPlayable.length===3,'Plus must remain on its current three-voice set');
for(const id of ['commons-beautiful-adhan','commons-andrewler-azan','commons-maahur-saeed'])assert(plusPlayable.some(x=>x.id===id),`Plus Adhan missing: ${id}`);
const rejectedIds=['commons-morocco-hassan-ii','commons-kazakhstan-shalqar','commons-aaqib-azeez','commons-mecca-maghrib-2012','commons-konya-2012','commons-tripoli-2019','commons-isfahan-shah'];
assert(!registry.some(x=>rejectedIds.includes(x.id)),'rejected Adhan ids must stay removed');
for(const id of rejectedIds)assert(!adhans.includes(`'${id}'`),`${id}: rejected Adhan must not be bundled`);
for(const x of playable){
 assert(Boolean(x.license),`${x.id}: license missing`);
 assert(Boolean(x.source),`${x.id}: source missing`);
 assert(Boolean(x.source_url),`${x.id}: source URL missing`);
 assert(Boolean(x.asset),`${x.id}: asset path missing`);
 assert(adhans.includes(`'${x.id}':require(`),`${x.id}: preview asset not bundled in adhanCatalog.js`);
 assert(adhans.includes(`'${x.id}':'`)&&adhans.includes('.wav'),`${x.id}: notification sound map missing`);
}
"""
qa=qa[:start]+new_sound_qa+qa[end:]
qa=must_replace(qa,"assert(legal.includes('سياسة الخصوصية')&&legal.includes('حقوق الطبع والنشر'),'full Arabic privacy and copyright screens required');","assert(legal.includes('سياسة الخصوصية')&&legal.includes('حقوق الطبع والنشر'),'full Arabic privacy and copyright screens required');\nassert(legal.includes('وسام محمد')&&legal.includes('Wissam Digital'),'owner identity must appear in privacy/copyright screens');\nconst activation=read('src/app/TrialPlusActivation.js');\nassert(app.includes(\"from './TrialPlusActivation';\"),'Trial Plus activation screen must be wired');\nassert(activation.includes('payment_data_copied')&&activation.includes('EXPO_PUBLIC_PAYMENT_COPY_WEBHOOK'),'copy-payment event must be ready for secure admin notification');\nassert(activation.includes(\"country!=='IQ'\"),'Plus activation must be restricted to Iraq');",'qa legal activation')
write('scripts/release-qa.js',qa)

# 7) Update Adhan license inventory.
license_doc="""# AlofoK — قائمة أصوات الأذان المعتمدة

## النسخة التجريبية — ستة أصوات مستعادة
1. أذان جميل — Adam-synagda — CC0 1.0 — `beautiful_adhan.ogg`
2. أذان — Andrewler — CC BY-SA 4.0 — `adhan_andrewler.ogg`
3. أذان — Aishatu98 — CC0 1.0 — `adhan_aishatu98.ogg`
4. أذان نيجيريا — Isaacayodele32 — CC BY-SA 4.0 — `adhan_nigeria_isaac.ogg`
5. أذان المدينة — تسجيل المسجد النبوي / ejaz215 — CC BY 3.0 — `adhan_medina_ejaz215.ogg`
6. أذان مكة — المسجد الحرام 2013 / Seyfula Islam — CC BY 3.0 — `adhan_mecca_2013.ogg`

## نسخة Plus الحالية
تبقى مجموعة Plus الحالية كما هي: Adam-synagda + Andrewler + مقام ماهور — Saeed Hatamzadeh-Varmazyar.

## قاعدة الترخيص
لا يُضاف أي تسجيل بلا مصدر وترخيص صريح يسمح بإعادة التوزيع. تبقى نسب المصادر وشروط CC BY / CC BY-SA واجبة حيث تنطبق.
"""
write('ADHAN_LICENSES_AR.md',license_doc)

# 8) Record seasonal asset provenance without introducing any external image.
prov=read('ASSET_PROVENANCE_AR.md')
marker='## ثيمات الفصول في النسخة التجريبية — 16 سبتمبر 2026'
if marker not in prov:
    prov += "\n\n"+marker+"\n\nتمت إتاحة الملفات الموجودة أصلًا في حزمة المشروع `season-spring.jpg` و`season-summer.jpg` و`season-autumn.jpg` و`season-winter.jpg` للنسخة التجريبية. لم تُجلب صور جديدة من الإنترنت؛ هذه الأصول جزء من حزمة الثيمات المولدة خصيصًا لمشروع الأفق.\n"
write('ASSET_PROVENANCE_AR.md',prov)

print('Trial refresh source migration applied successfully.')
