import registry from '../data/adhan-registry.json';

const ASSETS={
 'commons-beautiful-adhan':require('../../assets/adhan/beautiful_adhan.ogg'),
 'commons-andrewler-azan':require('../../assets/adhan/adhan_andrewler.ogg'),
 'commons-aishatu98-adhan':require('../../assets/adhan/adhan_aishatu98.ogg'),
 'commons-nigeria-isaac':require('../../assets/adhan/adhan_nigeria_isaac.ogg'),
 'commons-medina-ejaz215':require('../../assets/adhan/adhan_medina_ejaz215.ogg'),
 'commons-mecca-2013':require('../../assets/adhan/adhan_mecca_2013.ogg'),
 'commons-mecca-maghrib-2012':require('../../assets/adhan/adhan_mecca_maghrib_2012.ogg'),
 'commons-konya-2012':require('../../assets/adhan/adhan_konya_2012.ogg'),
 'commons-tripoli-2019':require('../../assets/adhan/adhan_tripoli_2019.ogg'),
 'commons-isfahan-shah':require('../../assets/adhan/adhan_isfahan_shah.ogg')
};

const NOTIFICATION_SOUNDS={
 'commons-beautiful-adhan':'beautiful_adhan.wav',
 'commons-andrewler-azan':'adhan_andrewler.wav',
 'commons-aishatu98-adhan':'adhan_aishatu98.wav',
 'commons-nigeria-isaac':'adhan_nigeria_isaac.wav',
 'commons-medina-ejaz215':'adhan_medina_ejaz215.wav',
 'commons-mecca-2013':'adhan_mecca_2013.wav',
 'commons-mecca-maghrib-2012':'adhan_mecca_maghrib_2012.wav',
 'commons-konya-2012':'adhan_konya_2012.wav',
 'commons-tripoli-2019':'adhan_tripoli_2019.wav',
 'commons-isfahan-shah':'adhan_isfahan_shah.wav'
};

const ENGLISH_NAMES={
 'commons-beautiful-adhan':'Studio-quality Adhan — Adam-synagda',
 'commons-andrewler-azan':'Adhan — Andrewler',
 'commons-aishatu98-adhan':'Adhan — Aishatu98',
 'commons-nigeria-isaac':'Nigeria Adhan — Isaacayodele32',
 'commons-medina-ejaz215':"Madinah Adhan — Prophet's Mosque recording",
 'commons-mecca-2013':'Makkah Adhan — Grand Mosque 2013',
 'commons-mecca-maghrib-2012':'Maghrib Adhan — Grand Mosque 2012',
 'commons-konya-2012':'Konya Adhan — Türkiye',
 'commons-tripoli-2019':'Tripoli Adhan — Al-Nour Square',
 'commons-isfahan-shah':'Isfahan Adhan — Shah Mosque'
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
