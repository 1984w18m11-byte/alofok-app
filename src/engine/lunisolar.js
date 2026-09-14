export const MONTHS_AR=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة','شهر النسيء'];
export const MONTHS_EN=['Muharram','Safar','Rabi I','Rabi II','Jumada I','Jumada II','Rajab',"Sha'ban",'Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah','Nasi Month'];
export const INTERCALARY_MONTH_AR='شهر النسيء';

// AlofoK research model constants.
// 1 Muharram 1 AH is anchored to 16 July 622 (Julian),
// equivalent to 19 July 622 in the proleptic Gregorian calendar.
// Months retain the mean synodic lunar length. The ~10.875-day annual
// shortfall is accumulated; whenever it reaches one lunation, a 13th
// month (Nasi) is inserted. This is a research model, not a claim that
// this exact intercalation sequence is historically established.
export const SYNODIC_MONTH_DAYS=29.530588853;
export const TROPICAL_YEAR_DAYS=365.24219;
export const LUNAR_COMMON_YEAR_DAYS=12*SYNODIC_MONTH_DAYS;
export const ANNUAL_SEASONAL_DRIFT_DAYS=TROPICAL_YEAR_DAYS-LUNAR_COMMON_YEAR_DAYS;
export const HIJRI_EPOCH_GREGORIAN=new Date(Date.UTC(622,6,19,0,0,0));
const DAY=86400000;

export const SEASONAL_POLICY={
  anchor:'1 Muharram 1 AH',
  epochJulian:'16 July 622',
  epochProlepticGregorian:'19 July 622',
  intercalation:'Accumulate the difference between one tropical year and twelve mean synodic months. When the accumulated difference reaches one mean lunation, append شهر النسيء as month 13.',
  rule:'Research implementation: lunar months remain lunar while leap months prevent the year count from losing roughly 10–11 days against the seasons each year.'
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

function researchYearForCompletedMonths(completedMonths){
  const m=Math.max(0,Math.floor(completedMonths));
  let year=Math.max(1,Math.floor((m*SYNODIC_MONTH_DAYS)/TROPICAL_YEAR_DAYS)+1);
  while(monthsBeforeYear(year+1)<=m)year+=1;
  while(year>1&&monthsBeforeYear(year)>m)year-=1;
  return year;
}

export function proposedLunisolarDate(date=new Date()){
  const instant=new Date(date);
  const elapsedDays=(instant-HIJRI_EPOCH_GREGORIAN)/DAY;
  if(!Number.isFinite(elapsedDays)||elapsedDays<0){
    return {year:1,month:1,day:1,monthNameAr:MONTHS_AR[0],estimated:true,start:new Date(HIJRI_EPOCH_GREGORIAN),isLeapYear:isLunisolarLeapYear(1),yearTypeAr:isLunisolarLeapYear(1)?'السنة الكبيسة':'السنة العادية',monthsInYear:monthsInLunisolarYear(1),intercalaryMonthAr:isLunisolarLeapYear(1)?INTERCALARY_MONTH_AR:null};
  }

  const completedMonths=Math.floor(elapsedDays/SYNODIC_MONTH_DAYS);
  const year=researchYearForCompletedMonths(completedMonths);
  const yearStartMonthIndex=monthsBeforeYear(year);
  const month=completedMonths-yearStartMonthIndex+1;
  const monthStartDays=completedMonths*SYNODIC_MONTH_DAYS;
  const day=Math.max(1,Math.min(30,Math.floor(elapsedDays-monthStartDays)+1));
  const start=new Date(HIJRI_EPOCH_GREGORIAN.getTime()+yearStartMonthIndex*SYNODIC_MONTH_DAYS*DAY);
  const isLeapYear=isLunisolarLeapYear(year);
  const monthsInYear=isLeapYear?13:12;

  return {
    year,
    month:Math.min(month,monthsInYear),
    day,
    monthNameAr:MONTHS_AR[Math.min(month,monthsInYear)-1],
    estimated:true,
    start,
    isLeapYear,
    yearTypeAr:isLeapYear?'السنة الكبيسة':'السنة العادية',
    monthsInYear,
    intercalaryMonthAr:isLeapYear?INTERCALARY_MONTH_AR:null,
    leapMonthsBeforeYear:leapMonthsThroughYears(year-1),
    model:'epoch-anchored accumulated-nasi'
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
  const targetMonths=monthsBeforeYear(targetYear)+(Math.min(current.month,monthsInLunisolarYear(targetYear))-1);
  const targetBase=new Date(HIJRI_EPOCH_GREGORIAN.getTime()+targetMonths*SYNODIC_MONTH_DAYS*DAY);
  targetBase.setUTCDate(targetBase.getUTCDate()+current.day-1);
  return targetBase;
}
