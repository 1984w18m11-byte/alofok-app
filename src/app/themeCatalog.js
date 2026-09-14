export const THEME_CATALOG=[
 {id:'trial-fixed',group:'fixed',labelKey:'themeFixed',plus:false,image:require('../../assets/themes/trial-fixed.jpg')},
 {id:'time-dawn',group:'atmospheres',labelKey:'dawn',plus:true,image:require('../../assets/themes/time-dawn.jpg')},
 {id:'time-morning',group:'atmospheres',labelKey:'morning',plus:true,image:require('../../assets/themes/time-morning.jpg')},
 {id:'time-midday',group:'atmospheres',labelKey:'day',plus:true,image:require('../../assets/themes/time-midday.jpg')},
 {id:'time-evening',group:'atmospheres',labelKey:'sunset',plus:true,image:require('../../assets/themes/time-evening.jpg')},
 {id:'time-night',group:'atmospheres',labelKey:'night',plus:true,image:require('../../assets/themes/time-night.jpg')},
 {id:'season-spring',group:'seasons',labelKey:'spring',plus:true,image:require('../../assets/themes/season-spring.jpg')},
 {id:'season-summer',group:'seasons',labelKey:'summer',plus:true,image:require('../../assets/themes/season-summer.jpg')},
 {id:'season-autumn',group:'seasons',labelKey:'autumn',plus:true,image:require('../../assets/themes/season-autumn.jpg')},
 {id:'season-winter',group:'seasons',labelKey:'winter',plus:true,image:require('../../assets/themes/season-winter.jpg')},
 {id:'week-sunday',group:'weekdays',labelKey:'sunday',plus:true,image:require('../../assets/themes/week-sunday.jpg')},
 {id:'week-monday',group:'weekdays',labelKey:'monday',plus:true,image:require('../../assets/themes/week-monday.jpg')},
 {id:'week-tuesday',group:'weekdays',labelKey:'tuesday',plus:true,image:require('../../assets/themes/week-tuesday.jpg')},
 {id:'week-wednesday',group:'weekdays',labelKey:'wednesday',plus:true,image:require('../../assets/themes/week-wednesday.jpg')},
 {id:'week-thursday',group:'weekdays',labelKey:'thursday',plus:true,image:require('../../assets/themes/week-thursday.jpg')},
 {id:'week-friday',group:'weekdays',labelKey:'friday',plus:true,image:require('../../assets/themes/week-friday.jpg')},
 {id:'week-saturday',group:'weekdays',labelKey:'saturday',plus:true,image:require('../../assets/themes/week-saturday.jpg')},
 {id:'month-muharram',group:'months',labelKey:'muharram',plus:true,image:require('../../assets/themes/month-muharram.jpg')},
 {id:'month-safar',group:'months',labelKey:'safar',plus:true,image:require('../../assets/themes/month-safar.jpg')},
 {id:'month-rabi1',group:'months',labelKey:'rabi1',plus:true,image:require('../../assets/themes/month-rabi1.jpg')},
 {id:'month-rabi2',group:'months',labelKey:'rabi2',plus:true,image:require('../../assets/themes/month-rabi2.jpg')},
 {id:'month-jumada1',group:'months',labelKey:'jumada1',plus:true,image:require('../../assets/themes/month-jumada1.jpg')},
 {id:'month-jumada2',group:'months',labelKey:'jumada2',plus:true,image:require('../../assets/themes/month-jumada2.jpg')},
 {id:'month-rajab',group:'months',labelKey:'rajab',plus:true,image:require('../../assets/themes/month-rajab.jpg')},
 {id:'month-shaban',group:'months',labelKey:'shaban',plus:true,image:require('../../assets/themes/month-shaban.jpg')},
 {id:'month-ramadan',group:'months',labelKey:'ramadan',plus:true,image:require('../../assets/themes/month-ramadan.jpg')},
 {id:'month-shawwal',group:'months',labelKey:'shawwal',plus:true,image:require('../../assets/themes/month-shawwal.jpg')},
 {id:'month-dhulqida',group:'months',labelKey:'dhulqida',plus:true,image:require('../../assets/themes/month-dhulqida.jpg')},
 {id:'month-dhulhijja',group:'months',labelKey:'dhulhijja',plus:true,image:require('../../assets/themes/month-dhulhijja.jpg')},
 {id:'special-new-year',group:'special',labelKey:'newYear',plus:true,image:require('../../assets/themes/special-new-year.jpg')},
 {id:'special-equinox',group:'special',labelKey:'equinox',plus:true,image:require('../../assets/themes/special-equinox.jpg')},
 {id:'special-solar-eclipse',group:'special',labelKey:'solarEclipse',plus:true,image:require('../../assets/themes/special-solar-eclipse.jpg')},
 {id:'special-lunar-eclipse',group:'special',labelKey:'lunarEclipse',plus:true,image:require('../../assets/themes/special-lunar-eclipse.jpg')},
 {id:'special-summer-solstice',group:'special',labelKey:'summerSolstice',plus:true,image:require('../../assets/themes/special-summer-solstice.jpg')},
 {id:'special-winter-solstice',group:'special',labelKey:'winterSolstice',plus:true,image:require('../../assets/themes/special-winter-solstice.jpg')}
];

export const THEME_BY_ID=Object.fromEntries(THEME_CATALOG.map(x=>[x.id,x]));
export const HOME_REFERENCE_BACKGROUND=THEME_BY_ID['trial-fixed'].image;

export function automaticThemeId(now=new Date()){
 const hour=now.getHours();
 if(hour>=4&&hour<7)return 'time-dawn';
 if(hour>=7&&hour<11)return 'time-morning';
 if(hour>=11&&hour<17)return 'time-midday';
 if(hour>=17&&hour<20)return 'time-evening';
 return 'time-night';
}
