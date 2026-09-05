
import {jdFromDate, sunEquatorial, moonEquatorial, horizontal, elongationDeg, findAltitudeCrossing} from "./astronomy";

/* Odeh q-adapter.
   Production must be validated against the exact published criterion implementation.
*/
export function odehScore(arcvDeg, WArcMin){
  const V = -0.1018*WArcMin**3 + 0.7319*WArcMin**2 - 6.3226*WArcMin + 7.1651;
  const q = arcvDeg - V;
  const cls = q>=5.65 ? "A"
    : q>=2.0 ? "B"
    : q>=-0.96 ? "C"
    : "D";
  return {q, class:cls, visible: cls==="A" || cls==="B"};
}

function crescentWidthArcMin(elongDeg){
  // Apparent lunar semidiameter ~15.5 arcmin; illuminated crescent width proxy.
  return 15.5 * (1 - Math.cos(elongDeg*Math.PI/180));
}

export function evaluateCrescentForUtcDate(dateUtcMidnight, lat, lon){
  const sunset=findAltitudeCrossing(dateUtcMidnight,lat,lon,sunEquatorial,-0.833,false);
  if(!sunset) return {visible:false,reason:"no_sunset"};
  const moonset=findAltitudeCrossing(dateUtcMidnight,lat,lon,moonEquatorial,0.125,false);
  const evalTime = new Date(sunset.getTime()+30*60000);
  const jd=jdFromDate(evalTime);
  const sAlt=horizontal(jd,lat,lon,sunEquatorial(jd)).altDeg;
  const mAlt=horizontal(jd,lat,lon,moonEquatorial(jd)).altDeg;
  const arcv=mAlt-sAlt;
  const arcl=elongationDeg(jd);
  const W=crescentWidthArcMin(arcl);
  const score=odehScore(arcv,W);
  return {sunset,moonset,evaluationTime:evalTime,arcvDeg:arcv,arclDeg:arcl,WArcMin:W,...score};
}
