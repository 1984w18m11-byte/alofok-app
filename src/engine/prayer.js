
import {jdFromDate, sunEquatorial} from "./astronomy";
const D2R=Math.PI/180, R2D=180/Math.PI;
const METHODS={
  MWL:{fajr:18,isha:17},
  EGYPT:{fajr:19.5,isha:17.5},
  KARACHI:{fajr:18,isha:18},
  UMM_AL_QURA:{fajr:18.5,ishaMinutes:90}
};
const norm=x=>((x%360)+360)%360;

function solarNoonAndDecl(dateUtc, lonDeg){
  const jd=jdFromDate(dateUtc);
  const T=(jd-2451545)/36525;
  const L0=norm(280.46646+T*(36000.76983+0.0003032*T));
  const M=norm(357.52911+T*(35999.05029-0.0001537*T))*D2R;
  const e=0.016708634-T*(0.000042037+0.0000001267*T);
  const y=Math.tan((23.439291-0.0130042*T)*D2R/2)**2;
  const eq=4*R2D*(y*Math.sin(2*L0*D2R)-2*e*Math.sin(M)+4*e*y*Math.sin(M)*Math.cos(2*L0*D2R)
    -0.5*y*y*Math.sin(4*L0*D2R)-1.25*e*e*Math.sin(2*M));
  const decl=sunEquatorial(jd).dec*R2D;
  const noonMin=720-4*lonDeg-eq;
  return {decl,noonMin,eq};
}
function hourAngle(lat,decl,alt){
  const p=lat*D2R,d=decl*D2R,a=alt*D2R;
  const c=(Math.sin(a)-Math.sin(p)*Math.sin(d))/(Math.cos(p)*Math.cos(d));
  if(c<-1||c>1)return null;
  return Math.acos(c)*R2D;
}
const pad=n=>String(n).padStart(2,"0");
function fmtMinutes(min,tzOffsetMin){
  let total=Math.round(min+tzOffsetMin);
  total=((total%1440)+1440)%1440;
  const h24=Math.floor(total/60);
  const m=total%60;
  const h12=h24%12||12;
  const ap=h24<12?"ص":"م";
  return `${h12}:${pad(m)} ${ap}`;
}
export function calculatePrayerTimes({date,lat,lon,tzOffsetMin,method="MWL",asrFactor=1}){
  const cfg=METHODS[method]||METHODS.MWL;
  const {decl,noonMin}=solarNoonAndDecl(date,lon);
  const Hrise=hourAngle(lat,decl,-0.833);
  const Hfajr=hourAngle(lat,decl,-cfg.fajr);
  const Hisha=cfg.isha ? hourAngle(lat,decl,-cfg.isha) : null;
  const p=lat*D2R,d=decl*D2R;
  const asrAlt=Math.atan(1/(asrFactor+Math.tan(Math.abs(p-d))))*R2D;
  const Hasr=hourAngle(lat,decl,asrAlt);
  const raw={
    fajr:Hfajr==null?null:noonMin-4*Hfajr,
    sunrise:Hrise==null?null:noonMin-4*Hrise,
    dhuhr:noonMin,
    asr:Hasr==null?null:noonMin+4*Hasr,
    maghrib:Hrise==null?null:noonMin+4*Hrise,
    isha: cfg.ishaMinutes ? noonMin+4*Hrise+cfg.ishaMinutes : (Hisha==null?null:noonMin+4*Hisha)
  };
  const formatted=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v==null?"--:--":fmtMinutes(v,tzOffsetMin)]));
  return {rawMinutesUtc:raw,formatted,method,declinationDeg:decl};
}

/*
 * معيار الأفق للصيام:
 * الإمساك: الشفق الصباحي المدني عندما يكون مركز الشمس عند -6°
 * الإفطار: نهاية الشفق المسائي المدني عندما يكون مركز الشمس عند -6°
 * القاعدة ثابتة، والوقت يتغير حسب الموقع والتاريخ.
 */
export function calculateFastingTimes({date,lat,lon,tzOffsetMin}){
  const FASTING_ALTITUDE=-6;
  const {decl,noonMin}=solarNoonAndDecl(date,lon);
  const H=hourAngle(lat,decl,FASTING_ALTITUDE);

  const raw={
    imsak:H==null?null:noonMin-4*H,
    iftar:H==null?null:noonMin+4*H
  };

  const formatted={
    imsak:raw.imsak==null?"--:--":fmtMinutes(raw.imsak,tzOffsetMin),
    iftar:raw.iftar==null?"--:--":fmtMinutes(raw.iftar,tzOffsetMin)
  };

  return {
    rawMinutesUtc:raw,
    formatted,
    criterion:"ALOFQ_CIVIL_TWILIGHT",
    sunAltitudeDeg:FASTING_ALTITUDE,
    declinationDeg:decl
  };
}
