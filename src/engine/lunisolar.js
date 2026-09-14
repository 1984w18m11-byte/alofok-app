export const MONTHS_AR=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة','شهر النسيء'];
export const MONTHS_EN=['Muharram','Safar','Rabi I','Rabi II','Jumada I','Jumada II','Rajab',"Sha'ban",'Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah','Nasi Month'];
export const INTERCALARY_MONTH_AR='شهر النسيء';

// AlofoK research model.
// The research hypothesis anchors 19 July 622 (proleptic Gregorian)
// to 1 Rajab 1 AH, then keeps normal Arabic month order from that point.
// This is deliberately separate from the conventional civil-Hijri epoch,
// which labels that epoch around 1 Muharram. It is a research assumption,
// not a claim that this reconstruction is historically established.
export const SYNODIC_MONTH_DAYS=29.530588853;
export const TROPICAL_YEAR_DAYS=365.24219;
export const LUNAR_COMMON_YEAR_DAYS=12*SYNODIC_MONTH_DAYS;
export const ANNUAL_SEASONAL_DRIFT_DAYS=TROPICAL_YEAR_DAYS-LUNAR_COMMON_YEAR_DAYS;
export const HIJRI_EPOCH_GREGORIAN=new Date(Date.UTC(622,6,19,0,0,0));
export const RESEARCH_EPOCH_YEAR=1;
export const RESEARCH_EPOCH_MONTH=7; // Rajab
const EPOCH_ABSOLUTE_MONTH=RESEARCH_EPOCH_MONTH-1; // 6 months after Muharram 1 AH
const DAY=86400000;

export const SEASONAL_POLICY={
  anchor:'Research hypothesis: 1 Rajab 1 AH',
  epochProlepticGregorian:'19 July 622',
  intercalation:'Accumulate the difference between one tropical year and twelve mean synodic months. When the accumulated difference reaches one mean lunation, append شهر النسيء after ذو الحجة.',
  rule:'Research implementation: preserve the ordinary Arabic month order, use Rajab as the epoch month in year 1, and insert Nasi only when accumulated seasonal drift reaches one lunar month.',
  historicalStatus:'Research reconstruction; not presented as the conventional historical Hijri dating.'
};

export function monthName(index,lang='ar'){
  const arr=lang==='ar'?MONTHS_AR:MONTHS_EN;
  return arr[index-1]||'';
}

export function leapMonthsThroughYears(years){
  const n=Math.max(0,Math.floor(Number(years)||0));
  return Math.floor((n*ANNUAL_SEASONAL_DRIFT_DAYS+1e-9)/SYNODIC_MONTH_DAYS);
}

export function isLunisolarLeapYear(researchYear){
  const year=Math.max(1,Math.floor(Number(researchYear)||1));
  return leapMonthsThroughYears(year)>leapMonthsThroughYears(year-1);
}

export function monthsInLunisolarYear(researchYear){
  return isLunisolarLeapYear(researchYear)?13:12;
}

function monthsBeforeYear(researchYear){
  const year=Math.max(1,Math.floor(Number(researchYear)||1));
  const completedYears=year-1;
  return completedYears*12+leapMonthsThroughYears(completedYears);
}

function researchYearForAbsoluteMonth(absoluteMonth){
  const m=Math.max(0,Math.floor(absoluteMonth));
  let year=Math.max(1,Math.floor((m*SYNODIC_MONTH_DAYS)/TROPICAL_YEAR_DAYS)+1);
  while(monthsBeforeYear(year+1)<=m)year+=1;
  while(year>1&&monthsBeforeYear(year)>m)year-=1;
  return year;
}

function dateAtAbsoluteMonthDay(absoluteMonth,day){
  const elapsedMonths=absoluteMonth-EPOCH_ABSOLUTE_MONTH;
  return new Date(HIJRI_EPOCH_GREGORIAN.getTime()+(elapsedMonths*SYNODIC_MONTH_DAYS+(day-1))*DAY);
}

export function proposedLunisolarDate(date=new Date()){
  const instant=new Date(date);
  const elapsedDays=(instant-HIJRI_EPOCH_GREGORIAN)/DAY;
  if(!Number.isFinite(elapsedDays))return proposedLunisolarDate(HIJRI_EPOCH_GREGORIAN);

  const completedMonths=Math.floor(elapsedDays/SYNODIC_MONTH_DAYS);
  const absoluteMonth=EPOCH_ABSOLUTE_MONTH+completedMonths;

  // Dates earlier than the model's implied 1 Muharram 1 AH are clamped.
  if(absoluteMonth<0){
    const isLeapYear=isLunisolarLeapYear(1);
    return {
      year:1,month:1,day:1,monthNameAr:MONTHS_AR[0],estimated:true,
      start:dateAtAbsoluteMonthDay(0,1),isLeapYear,
      yearTypeAr:isLeapYear?'السنة الكبيسة':'السنة العادية',
      monthsInYear:isLeapYear?13:12,
      intercalaryMonthAr:isLeapYear?INTERCALARY_MONTH_AR:null,
      leapMonthsBeforeYear:0,
      model:'epoch-rajab-accumulated-nasi'
    };
  }

  const year=researchYearForAbsoluteMonth(absoluteMonth);
  const yearStartMonthIndex=monthsBeforeYear(year);
  const monthOffset=absoluteMonth-yearStartMonthIndex;
  const monthsInYear=monthsInLunisolarYear(year);
  const month=Math.max(1,Math.min(monthOffset+1,monthsInYear));
  const monthStartElapsedDays=completedMonths*SYNODIC_MONTH_DAYS;
  const day=Math.max(1,Math.min(30,Math.floor(elapsedDays-monthStartElapsedDays)+1));
  const start=dateAtAbsoluteMonthDay(yearStartMonthIndex,1);
  const isLeapYear=monthsInYear===13;

  return {
    year,
    month,
    day,
    monthNameAr:MONTHS_AR[month-1],
    estimated:true,
    start,
    isLeapYear,
    yearTypeAr:isLeapYear?'السنة الكبيسة':'السنة العادية',
    monthsInYear,
    intercalaryMonthAr:isLeapYear?INTERCALARY_MONTH_AR:null,
    leapMonthsBeforeYear:leapMonthsThroughYears(year-1),
    model:'epoch-rajab-accumulated-nasi'
  };
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
  return new Date(new Date(date).getTime()+delta*SYNODIC_MONTH_DAYS*DAY);
}

export function addLunisolarYears(date,delta){
  const current=proposedLunisolarDate(date);
  const targetYear=Math.max(1,current.year+delta);
  const targetMonth=Math.min(current.month,monthsInLunisolarYear(targetYear));
  const targetAbsoluteMonth=monthsBeforeYear(targetYear)+(targetMonth-1);
  return dateAtAbsoluteMonthDay(targetAbsoluteMonth,current.day);
}
