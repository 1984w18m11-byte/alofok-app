
const D2R = Math.PI/180, R2D = 180/Math.PI;
const DAYMS = 86400000;

export function jdFromDate(date){ return date.getTime()/DAYMS + 2440587.5; }
export function dateFromJd(jd){ return new Date((jd-2440587.5)*DAYMS); }
const norm360 = x => ((x%360)+360)%360;
const norm180 = x => { let y=norm360(x); return y>180?y-360:y; };

export function gmstDeg(jd){
  const T=(jd-2451545.0)/36525;
  return norm360(280.46061837 + 360.98564736629*(jd-2451545.0)
    +0.000387933*T*T - T*T*T/38710000);
}

export function sunEquatorial(jd){
  const n=jd-2451545.0;
  const L=norm360(280.460+0.9856474*n);
  const g=norm360(357.528+0.9856003*n)*D2R;
  const lambda=norm360(L+1.915*Math.sin(g)+0.020*Math.sin(2*g))*D2R;
  const eps=(23.439-0.0000004*n)*D2R;
  const ra=Math.atan2(Math.cos(eps)*Math.sin(lambda),Math.cos(lambda));
  const dec=Math.asin(Math.sin(eps)*Math.sin(lambda));
  return {ra: norm360(ra*R2D)*D2R, dec, eclLon: norm360(lambda*R2D)};
}

/* Truncated lunar model for app-level phase/visibility preview.
   Production validation should compare against JPL ephemerides. */
export function moonEquatorial(jd){
  const d=jd-2451543.5;
  const N=norm360(125.1228-0.0529538083*d)*D2R;
  const i=5.1454*D2R;
  const w=norm360(318.0634+0.1643573223*d)*D2R;
  const a=60.2666, e=0.054900;
  const M=norm360(115.3654+13.0649929509*d)*D2R;
  let E=M + e*Math.sin(M)*(1+e*Math.cos(M));
  for(let k=0;k<5;k++) E=E-(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  let xv=a*(Math.cos(E)-e), yv=a*Math.sqrt(1-e*e)*Math.sin(E);
  let v=Math.atan2(yv,xv), r=Math.hypot(xv,yv);
  let xh=r*(Math.cos(N)*Math.cos(v+w)-Math.sin(N)*Math.sin(v+w)*Math.cos(i));
  let yh=r*(Math.sin(N)*Math.cos(v+w)+Math.cos(N)*Math.sin(v+w)*Math.cos(i));
  let zh=r*(Math.sin(v+w)*Math.sin(i));
  let lon=Math.atan2(yh,xh), lat=Math.atan2(zh,Math.hypot(xh,yh));

  // Main perturbations
  const Ms=norm360(356.0470+0.9856002585*d)*D2R;
  const Ls=norm360(282.9404+4.70935e-5*d + Ms*R2D)*D2R;
  const Lm=norm360(N*R2D+w*R2D+M*R2D)*D2R;
  const D=norm360((Lm-Ls)*R2D)*D2R, F=norm360((Lm-N)*R2D)*D2R;
  lon += (-1.274*Math.sin(M-2*D)+0.658*Math.sin(2*D)-0.186*Math.sin(Ms)
       -0.059*Math.sin(2*M-2*D)-0.057*Math.sin(M-2*D+Ms)
       +0.053*Math.sin(M+2*D)+0.046*Math.sin(2*D-Ms)
       +0.041*Math.sin(M-Ms)-0.035*Math.sin(D)-0.031*Math.sin(M+Ms)
       -0.015*Math.sin(2*F-2*D)+0.011*Math.sin(M-4*D))*D2R;
  lat += (-0.173*Math.sin(F-2*D)-0.055*Math.sin(M-F-2*D)
       -0.046*Math.sin(M+F-2*D)+0.033*Math.sin(F+2*D)
       +0.017*Math.sin(2*M+F))*D2R;

  const eps=(23.4393-3.563e-7*d)*D2R;
  const xe=Math.cos(lon)*Math.cos(lat);
  const ye=Math.sin(lon)*Math.cos(lat)*Math.cos(eps)-Math.sin(lat)*Math.sin(eps);
  const ze=Math.sin(lon)*Math.cos(lat)*Math.sin(eps)+Math.sin(lat)*Math.cos(eps);
  const ra=Math.atan2(ye,xe), dec=Math.atan2(ze,Math.hypot(xe,ye));
  return {ra:norm360(ra*R2D)*D2R, dec, eclLon:norm360(lon*R2D), eclLat:lat*R2D, distanceEarthRadii:r};
}

export function horizontal(jd, latDeg, lonDeg, eq){
  const lst=norm360(gmstDeg(jd)+lonDeg)*D2R;
  const H=norm180((lst-eq.ra)*R2D)*D2R, lat=latDeg*D2R;
  const alt=Math.asin(Math.sin(lat)*Math.sin(eq.dec)+Math.cos(lat)*Math.cos(eq.dec)*Math.cos(H));
  const az=Math.atan2(-Math.sin(H),Math.tan(eq.dec)*Math.cos(lat)-Math.sin(lat)*Math.cos(H));
  return {altDeg:alt*R2D, azDeg:norm360(az*R2D)};
}

export function elongationDeg(jd){
  const s=sunEquatorial(jd), m=moonEquatorial(jd);
  const cosE=Math.sin(s.dec)*Math.sin(m.dec)+Math.cos(s.dec)*Math.cos(m.dec)*Math.cos(s.ra-m.ra);
  return Math.acos(Math.max(-1,Math.min(1,cosE)))*R2D;
}

export function illumination(jd){
  const e=elongationDeg(jd)*D2R;
  return (1-Math.cos(e))/2;
}

export function findConjunctionNear(date){
  // root of geocentric ecliptic longitude difference, robust bracket scan
  let jd0=jdFromDate(date)-18, best=null;
  let prevJd=jd0, prev=norm180(moonEquatorial(prevJd).eclLon-sunEquatorial(prevJd).eclLon);
  for(let h=1;h<=36*24;h++){
    const jd=jd0+h/24;
    const cur=norm180(moonEquatorial(jd).eclLon-sunEquatorial(jd).eclLon);
    if(Math.abs(cur)<(best?.err??999)) best={jd,err:Math.abs(cur)};
    if(prev<0 && cur>=0 && Math.abs(cur-prev)<30){
      let a=prevJd,b=jd;
      for(let k=0;k<35;k++){
        const mid=(a+b)/2;
        const v=norm180(moonEquatorial(mid).eclLon-sunEquatorial(mid).eclLon);
        if(v>=0)b=mid; else a=mid;
      }
      return dateFromJd((a+b)/2);
    }
    prev=cur; prevJd=jd;
  }
  return dateFromJd(best.jd);
}

export function findAltitudeCrossing(dateUtcMidnight, lat, lon, body, targetAltDeg, rising){
  const jd0=jdFromDate(dateUtcMidnight);
  let prev=horizontal(jd0,lat,lon,body(jd0)).altDeg-targetAltDeg;
  for(let i=1;i<=288;i++){
    const jd=jd0+i/288;
    const cur=horizontal(jd,lat,lon,body(jd)).altDeg-targetAltDeg;
    const crossed = rising ? (prev<0&&cur>=0) : (prev>=0&&cur<0);
    if(crossed){
      let a=jd-1/288,b=jd;
      for(let k=0;k<25;k++){
        const mid=(a+b)/2;
        const v=horizontal(mid,lat,lon,body(mid)).altDeg-targetAltDeg;
        if(rising ? v>=0 : v<0) b=mid; else a=mid;
      }
      return dateFromJd((a+b)/2);
    }
    prev=cur;
  }
  return null;
}

export function localAstronomySnapshot(date, lat, lon){
  const jd=jdFromDate(date);
  const s=sunEquatorial(jd), m=moonEquatorial(jd);
  return {
    sun: horizontal(jd,lat,lon,s),
    moon: horizontal(jd,lat,lon,m),
    elongationDeg: elongationDeg(jd),
    illumination: illumination(jd)
  };
}
