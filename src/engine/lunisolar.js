import {findConjunctionNear} from './astronomy';

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
