
import registry from "../data/adhan-registry.json";

export function playableAdhanPacks(){
  return registry.filter(x => x.status==="licensed" && !!x.asset);
}
export function packsForLocation(country,cityId){
  return registry.filter(x => (x.country==="*"||x.country===country) && (x.city==="*"||x.city===cityId));
}
export function canPlay(pack){
  return pack?.status==="licensed" && !!pack?.asset;
}
