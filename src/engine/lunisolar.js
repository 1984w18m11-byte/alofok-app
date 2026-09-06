import {findConjunctionNear} from './astronomy';

export const MONTHS_AR=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
export const MONTHS_EN=['Muharram','Safar','Rabi I','Rabi II','Jumada I','Jumada II','Rajab',"Sha'ban",'Ramadan','Shawwal','Dhu al-Qidah','Dhu al-Hijjah'];
export const CORRECTION_PERIOD_AR='فترة التصحيح السنوية';
export const CORRECTION_PERIOD_EN='Annual correction period';
const SYNODIC=29.530588853;
const DAY=86400000;

export const SEASONAL_POLICY={
  anchor:'Ramadan',
  targetWindow:{startMonth:9,startDay:8,endMonth:10,endDay:7},
  rule:'Research implementation: choose the lunation nearest the September seasonal Ramadan anchor, then back-count eight lunar months to Muharram. Local crescent validation remains a separate layer.'
};

export function monthName(index,lang='ar'){
  if(index===13)return lang==='ar'?CORRECTION_PERIOD_AR:CORRECTION_PERIOD_EN;
  const arr=lang==='ar'?MONTHS_AR:MONTHS_EN;
  return arr[index-1]||'';
}

function ramadanAnchorForGregorianYear(year){
  // Midpoint of the research window; find the conjunction nearest it, then use next evening proxy.
  const target=new Date(Date.UTC(year,8,22,12,0,0));
  const conjunction=findConjunctionNear(target);
  return new Date(conjunction.getTime()+DAY); // visibility proxy; CrescentEngine can override in production
}

function muharramStartForGregorianYear(year){
  const ramadan=ramadanAnchorForGregorianYear(year);
  return new Date(ramadan.getTime()-8*SYNODIC*DAY);
}

export function proposedLunisolarDate(date=new Date()){
  let solarYear=date.getUTCFullYear();
  let start=muharramStartForGregorianYear(solarYear);
  if(date < start){
    solarYear-=1;
    start=muharramStartForGregorianYear(solarYear);
  }
  const days=(date-start)/DAY;
  const nextStart=muharramStartForGregorianYear(solarYear+1);
  const regularYearDays=12*SYNODIC;
  if(days>=regularYearDays){
    const correctionStart=new Date(start.getTime()+regularYearDays*DAY);
    const correctionLength=Math.max(1,Math.ceil((nextStart-correctionStart)/DAY));
    const correctionDay=Math.max(1,Math.min(correctionLength,Math.floor((date-correctionStart)/DAY)+1));
    return {year:solarYear-578,month:13,day:correctionDay,monthNameAr:CORRECTION_PERIOD_AR,estimated:true,start,correctionStart,correctionLength,isCorrection:true};
  }
  let month=Math.floor(days/SYNODIC)+1;
  if(month<1) month=1;
  if(month>12) month=12;
  const monthStart=new Date(start.getTime()+(month-1)*SYNODIC*DAY);
  const day=Math.max(1,Math.min(30,Math.floor((date-monthStart)/DAY)+1));
  // Research year numbering aligned so Gregorian 2026 maps to Hijri year 1448.
  const year=solarYear-578;
  return {year,month,day,monthNameAr:MONTHS_AR[month-1],estimated:true,start,isCorrection:false};
}

export function lunisolarMonthLength(date=new Date()){
  const current=proposedLunisolarDate(date);
  if(current.isCorrection)return current.correctionLength;
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
  for(let i=-35;i<=35;i++){const x=new Date(d);x.setUTCDate(x.getUTCDate()+i);const ld=proposedLunisolarDate(x);if(ld.month===current.month&&ld.day===current.day)return x;}
  return d;
}
