import registry from '../data/adhan-registry.json';

const ASSETS={
 'commons-beautiful-adhan':require('../../assets/adhan/beautiful_adhan.ogg'),
 'commons-andrewler-azan':require('../../assets/adhan/adhan_andrewler.ogg'),
 'commons-maahur-saeed':require('../../assets/adhan/adhan_maahur.ogg')
};

const NOTIFICATION_SOUNDS={
 'commons-beautiful-adhan':'beautiful_adhan.wav',
 'commons-andrewler-azan':'adhan_andrewler.wav',
 'commons-maahur-saeed':'adhan_maahur.wav'
};

const ENGLISH_NAMES={
 'commons-beautiful-adhan':'Beautiful Adhan — Adam-synagda',
 'commons-andrewler-azan':'Full Arabic Adhan — Andrewler',
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
