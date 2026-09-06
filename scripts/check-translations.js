const fs=require('fs');
const app=fs.readFileSync('App.js','utf8');
const translations=fs.readFileSync('src/i18n/translations.js','utf8');
const locales=fs.readFileSync('src/i18n/locales.js','utf8');
const appKeys=[...app.matchAll(/\bt\('([^']+)'\)/g)].map(m=>m[1]);
const unique=[...new Set(appKeys)];
const localeIds=[...locales.matchAll(/\['([^']+)','/g)].map(m=>m[1]).filter(x=>x!=='system');
const packMatches=[...translations.matchAll(/(?:^|\n)\s*'?([a-z]{2}(?:-[A-Z]{2})?)'?:\{([^}]*)\}/g)];
const packs=Object.fromEntries(packMatches.map(([,id,body])=>[id,new Set([...body.matchAll(/([A-Za-z][A-Za-z0-9]*):/g)].map(m=>m[1]))]));
let failed=false;
for(const id of localeIds){
 const base=id.split('-')[0];
 const keys=packs[id]||packs[base];
 if(!keys){console.error('MISSING PACK:',id);failed=true;continue}
 const missing=unique.filter(k=>!keys.has(k));
 if(missing.length){console.error('MISSING KEYS:',id,missing.join(','));failed=true}
}
const untranslated=[...app.matchAll(/>([^<>{}]*[\u0600-\u06ff][^<>{}]*)</g)].map(m=>m[1].trim()).filter(Boolean);
if(untranslated.length){console.error('UNMIGRATED ARABIC UI TEXT:',[...new Set(untranslated)].join(' | '));failed=true}
if(failed)process.exit(1);
console.log('All selected locales cover every translated UI key and no raw Arabic UI text remains.');
