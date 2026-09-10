from pathlib import Path
import re

app_path = Path('App.js')
app = app_path.read_text()

def replace_once(old, new, label):
    global app
    count = app.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    app = app.replace(old, new, 1)

replace_once("const SUPPORT_ACCOUNT='';", "const SUPPORT_ACCOUNT=process.env.EXPO_PUBLIC_SUPPORT_ACCOUNT||'';", 'support account source')
replace_once(" const [showMainMenu,setShowMainMenu]=useState(false);", " const [showMainMenu,setShowMainMenu]=useState(false);\n const [showSupportAccount,setShowSupportAccount]=useState(false);", 'support panel state')
replace_once("    if(PRAYER_METHODS.some(([id])=>id===savedMethod))setMethod(savedMethod);", "    // AlofoK uses one fixed prayer-time calculation method; old saved method choices are ignored.", 'ignore old prayer method choice')
replace_once("   method,\n   asrFactor:1\n }),[coords.lat,coords.lon,prayerCalcDate,method,tzOffsetMin]);", "   method:'MWL',\n   asrFactor:1\n }),[coords.lat,coords.lon,prayerCalcDate,tzOffsetMin]);", 'fixed prayer method')
replace_once("      <Text style={s.appSub}>تقويم عربي ثابت ومواقيت الصلاة</Text>", "      <Text style={s.appSub}>تقويم الأفق — التقويم العربي الثابت</Text>", 'header calendar identity')
replace_once("     <Pressable style={s.mainMenuItem} onPress={()=>Alert.alert('دعم تطوير الأفق','رقم الدعم وخيار النسخ موجودان في الصفحة الرئيسية.')}><Text style={s.mainMenuText}>$  دعم تطوير الأفق</Text></Pressable>", "     <Pressable style={s.mainMenuItem} onPress={()=>{setShowSupportAccount(v=>!v);setShowMainMenu(false)}}><Text style={s.mainMenuText}>$  دعمكم لتطوير برنامج الأفق</Text></Pressable>", 'support menu label')
replace_once("    </View>}\n   </View>}\n   {tab==='today'&&<>", "    </View>}\n    <View style={s.supportQuickWrap}>\n     <Pressable accessibilityLabel='دعمكم لتطوير برنامج الأفق' style={s.supportButton} onPress={()=>setShowSupportAccount(v=>!v)}><Text style={s.supportButtonText}>$  دعمكم لتطوير برنامج الأفق</Text></Pressable>\n     {showSupportAccount&&<View style={s.supportMiniPanel}><Text selectable style={s.supportMiniAccount}>{SUPPORT_ACCOUNT||'سيُضاف رقم الدعم لاحقًا'}</Text><Pressable accessibilityLabel='نسخ رقم الدعم' style={[s.supportMiniCopy,!SUPPORT_ACCOUNT&&s.copyButtonDisabled]} onPress={copySupportAccount}><Text style={s.supportMiniCopyText}>نسخ</Text></Pressable></View>}\n    </View>\n   </View>}\n   {tab==='today'&&<>", 'compact support button')
replace_once("  <Text style={s.researchIdentity}>تقويم عربي ثابت — بحث علمي مقترح، وليس تقويمًا شرعيًا رسميًا</Text>", "  <Text style={s.researchIdentity}>تقويم الأفق — التقويم العربي الثابت • بحث علمي، وليس تقويمًا شرعيًا رسميًا</Text>", 'research identity')

old_support = """    <View style={s.supportCard}>\n     <View style={s.supportHeading}><Text style={s.supportTitle}>دعم تطوير الأفق</Text><Text style={s.supportDollar}>$</Text></View>\n     <Text style={s.supportDescription}>دعم اختياري لاستمرار تطوير التطبيق. حدّد المبلغ من محفظتك دون مبالغ مقترحة.</Text>\n     <View style={s.supportAccountRow}>\n      <Text selectable style={s.supportAccount}>{SUPPORT_ACCOUNT||'سيُضاف رقم الدعم لاحقًا'}</Text>\n      <Pressable accessibilityLabel='نسخ رقم الدعم' style={[s.copyButton,!SUPPORT_ACCOUNT&&s.copyButtonDisabled]} onPress={copySupportAccount}><Text style={s.copyButtonIcon}>▣</Text><Text style={s.copyButtonText}>نسخ</Text></Pressable>\n     </View>\n    </View>\n    \n"""
replace_once(old_support, '', 'remove large support card')
replace_once("     <Text style={s.researchNotice}>نسخة بحثية تقديرية وليست تقويمًا شرعيًا أو رسميًا معتمدًا.</Text>", "     <Text style={s.researchNotice}>{calendarView.isLeapYear?'السنة الكبيسة: 13 شهرًا، والشهر الثالث عشر هو شهر النسيء.':'السنة العادية: 12 شهرًا.'}</Text>", 'leap year label')

calculation_card = re.compile(r"\n    <SettingsCard title=\{t\('calculation'\)\}><View style=\{s\.wrap\}>\{PRAYER_METHODS\.map\(\(\[id,label\]\)=>.*?</SettingsCard>", re.S)
app, removed = calculation_card.subn('', app, count=1)
if removed != 1:
    raise SystemExit(f'calculation settings card: expected 1 match, found {removed}')

style_anchor = " background:{flex:1,backgroundColor:'#020b12'},supportCard:"
style_insert = " background:{flex:1,backgroundColor:'#020b12'},supportQuickWrap:{alignItems:'flex-end',marginTop:2,marginBottom:3},supportButton:{alignSelf:'flex-end',minHeight:32,paddingVertical:6,paddingHorizontal:9,borderRadius:9,borderWidth:1,borderColor:'#b98532',backgroundColor:'rgba(28,20,8,.88)'},supportButtonText:{color:'#f4bb52',fontSize:10,fontWeight:'900',textAlign:'center'},supportMiniPanel:{alignSelf:'flex-end',flexDirection:'row-reverse',alignItems:'center',gap:6,marginTop:5,padding:5,borderRadius:9,borderWidth:1,borderColor:'#4b5961',backgroundColor:'rgba(2,16,24,.94)'},supportMiniAccount:{minWidth:120,maxWidth:205,color:'#fff',fontSize:11,fontWeight:'800',textAlign:'center',paddingHorizontal:6},supportMiniCopy:{minWidth:48,minHeight:31,paddingHorizontal:8,borderRadius:8,backgroundColor:'#efb44d',alignItems:'center',justifyContent:'center'},supportMiniCopyText:{color:'#111820',fontSize:11,fontWeight:'900'},supportCard:"
replace_once(style_anchor, style_insert, 'compact support styles')
app_path.write_text(app)

translations_path = Path('src/i18n/translations.js')
translations = translations_path.read_text()
old_ar = "prayerTimes:'مواقيت الصلاة',prayerHint:'مواقيت اليوم حسب موقعك الحالي',arabicCalendar:'التقويم العربي'"
new_ar = "prayerTimes:'مواقيت الصلاة',prayerHint:'حساب مواقيت الصلاة ثابت، والمواقيت نفسها تتغير حسب التاريخ والموقع',arabicCalendar:'تقويم الأفق'"
if old_ar not in translations:
    raise SystemExit('Arabic prayer/calendar translations anchor not found')
translations = translations.replace(old_ar, new_ar, 1)
translations = re.sub(r"arabicCalendar:'([^']*)'", lambda m: m.group(0) if m.group(1) == 'تقويم الأفق' else "arabicCalendar:'AlofoK Calendar'", translations)
translations_path.write_text(translations)

lunar_path = Path('src/engine/lunisolar.js')
lunar = r'''import {findConjunctionNear} from './astronomy';

export const MONTHS_AR=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة','شهر النسيء'];
export const MONTHS_EN=['Muharram','Safar','Rabi I','Rabi II','Jumada I','Jumada II','Rajab',"Sha'ban",'Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah','Nasi Month'];
export const INTERCALARY_MONTH_AR='شهر النسيء';
const SYNODIC=29.530588853;
const DAY=86400000;

export const SEASONAL_POLICY={
  anchor:'Ramadan',
  targetWindow:{startMonth:9,startDay:8,endMonth:10,endDay:7},
  intercalation:'When the interval between two consecutive seasonal Muharram anchors spans 13 lunations, that research year is a leap year and its thirteenth month is شهر النسيء.',
  rule:'Research implementation: choose the lunation nearest the September seasonal Ramadan anchor, then back-count eight lunar months to Muharram. Local crescent validation remains a separate layer.'
};

export function monthName(index,lang='ar'){
  const arr=lang==='ar'?MONTHS_AR:MONTHS_EN;
  return arr[index-1]||'';
}

function ramadanAnchorForGregorianYear(year){
  const target=new Date(Date.UTC(year,8,22,12,0,0));
  const conjunction=findConjunctionNear(target);
  return new Date(conjunction.getTime()+DAY);
}

function muharramStartForGregorianYear(year){
  const ramadan=ramadanAnchorForGregorianYear(year);
  return new Date(ramadan.getTime()-8*SYNODIC*DAY);
}

function monthsInSolarAnchorYear(solarYear){
  const start=muharramStartForGregorianYear(solarYear);
  const next=muharramStartForGregorianYear(solarYear+1);
  const lunations=Math.round((next-start)/(SYNODIC*DAY));
  return lunations>=13?13:12;
}

export function isLunisolarLeapYear(researchYear){
  const solarYear=Number(researchYear)+578;
  return monthsInSolarAnchorYear(solarYear)===13;
}

export function monthsInLunisolarYear(researchYear){
  return isLunisolarLeapYear(researchYear)?13:12;
}

export function proposedLunisolarDate(date=new Date()){
  let solarYear=date.getUTCFullYear();
  let start=muharramStartForGregorianYear(solarYear);
  if(date < start){
    solarYear-=1;
    start=muharramStartForGregorianYear(solarYear);
  }
  const year=solarYear-578;
  const monthsInYear=monthsInSolarAnchorYear(solarYear);
  const days=(date-start)/DAY;
  let month=Math.floor(days/SYNODIC)+1;
  if(month<1) month=1;
  if(month>monthsInYear) month=monthsInYear;
  const monthStart=new Date(start.getTime()+(month-1)*SYNODIC*DAY);
  const day=Math.max(1,Math.min(30,Math.floor((date-monthStart)/DAY)+1));
  const isLeapYear=monthsInYear===13;
  return {year,month,day,monthNameAr:MONTHS_AR[month-1],estimated:true,start,isLeapYear,yearTypeAr:isLeapYear?'السنة الكبيسة':'السنة العادية',monthsInYear,intercalaryMonthAr:isLeapYear?INTERCALARY_MONTH_AR:null};
}

export function lunisolarMonthLength(date=new Date()){
  const current=proposedLunisolarDate(date);
  const first=new Date(date);
  first.setUTCDate(first.getUTCDate()-(current.day-1));
  for(let n=29;n<=30;n++){
    const probe=new Date(first);
    probe.setUTCDate(probe.getUTCDate()+n);
    const x=proposedLunisolarDate(probe);
    if(x.month!==current.month||x.year!==current.year)return n;
  }
  return 30;
}

export function addLunisolarMonths(date,delta){
  return new Date(new Date(date).getTime()+delta*SYNODIC*DAY);
}

export function addLunisolarYears(date,delta){
  const current=proposedLunisolarDate(date);
  let d=new Date(date);
  d.setUTCFullYear(d.getUTCFullYear()+delta);
  for(let i=-35;i<=35;i++){
    const x=new Date(d);
    x.setUTCDate(x.getUTCDate()+i);
    const ld=proposedLunisolarDate(x);
    if(ld.month===current.month&&ld.day===current.day)return x;
  }
  return d;
}
'''
lunar_path.write_text(lunar)

app = app_path.read_text()
checks = [
    ('compact support label', 'دعمكم لتطوير برنامج الأفق' in app),
    ('calculation selector removed', "title={t('calculation')}" not in app),
    ('prayer method fixed', "method:'MWL'" in app),
    ('AlofoK identity', 'تقويم الأفق — التقويم العربي الثابت' in app),
    ('leap-year wording', 'السنة الكبيسة: 13 شهرًا' in app),
    ('Nasi month', 'شهر النسيء' in lunar_path.read_text()),
]
failed = [name for name, ok in checks if not ok]
if failed:
    raise SystemExit('Sanity checks failed: ' + ', '.join(failed))

print('AlofoK requested source updates applied successfully.')
