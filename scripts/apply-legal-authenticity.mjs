import fs from 'node:fs';

const appPath='src/app/AppV3.js';
const stringsPath='src/app/v3Strings.js';
const qaPath='scripts/release-qa.js';
let app=fs.readFileSync(appPath,'utf8');
let strings=fs.readFileSync(stringsPath,'utf8');
let qa=fs.readFileSync(qaPath,'utf8');

const mustReplace=(text,pattern,replacement,label)=>{
 const next=text.replace(pattern,replacement);
 if(next===text)throw new Error(`Patch failed: ${label}`);
 return next;
};

if(!app.includes("from './LegalScreens';")){
 app=mustReplace(
  app,
  "import {useCountryHolidays} from './useCountryHolidays';",
  "import {useCountryHolidays} from './useCountryHolidays';\nimport {AuthenticityScreen,CopyrightScreen,PrivacyScreen} from './LegalScreens';",
  'legal screen import'
 );
}

if(app.includes('function PrivacyScreen({t,rtl,onBack})')){
 app=mustReplace(
  app,
  /function PrivacyScreen\(\{t,rtl,onBack\}\)\{[\s\S]*?\n\}\n\n(?=function SettingsScreen)/,
  '',
  'remove legacy privacy screen'
 );
}

if(!app.includes("if(screen==='copyright')")){
 app=mustReplace(
  app,
  " if(screen==='privacy')return <PrivacyScreen t={t} rtl={rtl} onBack={goHome}/>;",
  " if(screen==='privacy')return <PrivacyScreen rtl={rtl} onBack={goHome} onNavigate={navigate}/>;\n if(screen==='copyright')return <CopyrightScreen rtl={rtl} onBack={()=>setScreen('privacy')}/>;\n if(screen==='authenticity')return <AuthenticityScreen rtl={rtl} onBack={()=>setScreen('privacy')} edition={IS_PLUS?'plus':'trial'} version={VERSION}/>;",
  'legal routes'
 );
}else if(app.includes("<PrivacyScreen t={t} rtl={rtl}")){
 app=mustReplace(
  app,
  " if(screen==='privacy')return <PrivacyScreen t={t} rtl={rtl} onBack={goHome}/>;",
  " if(screen==='privacy')return <PrivacyScreen rtl={rtl} onBack={goHome} onNavigate={navigate}/>;",
  'privacy route props'
 );
}

if(!strings.includes("copyright:'Copyright & IP'")){
 strings=mustReplace(
  strings,
  "about:'About',privacy:'Privacy',close:'Close'",
  "about:'About',privacy:'Privacy',copyright:'Copyright & IP',authenticity:'Verify authenticity',close:'Close'",
  'English legal strings'
 );
}
if(!strings.includes("copyright:'حقوق الطبع والنشر'")){
 strings=mustReplace(
  strings,
  "about:'حول',privacy:'الخصوصية',close:'إغلاق'",
  "about:'حول',privacy:'الخصوصية',copyright:'حقوق الطبع والنشر',authenticity:'التحقق من الأصالة',close:'إغلاق'",
  'Arabic legal strings'
 );
}

if(!qa.includes('legal/authenticity screens must be wired')){
 qa += `\n// Legal, privacy and authenticity verification guards\n`;
 qa += `assert(app.includes("from './LegalScreens';"),'legal/authenticity screens must be wired');\n`;
 qa += `assert(app.includes("screen==='copyright'")&&app.includes("screen==='authenticity'"),'copyright and authenticity routes must exist');\n`;
 qa += `const legal=read('src/app/LegalScreens.js');\n`;
 qa += `assert(legal.includes('سياسة الخصوصية')&&legal.includes('حقوق الطبع والنشر'),'full Arabic privacy and copyright screens required');\n`;
 qa += `assert(legal.includes('react-native-qrcode-svg'),'authenticity screen must render QR codes');\n`;
 qa += `const authClient=read('src/app/authenticityClient.js');\n`;
 qa += `assert(authClient.includes('EXPO_PUBLIC_AUTH_API_URL')&&authClient.includes('/v1/authenticity/challenge'),'authenticity API contract missing');\n`;
 qa += `assert(authClient.includes("edition,version,installationId"),'authenticity challenge must bind edition, version and installation');\n`;
 qa += `const pkgLegal=JSON.parse(read('package.json'));\n`;
 qa += `assert(pkgLegal.dependencies['react-native-qrcode-svg']&&pkgLegal.dependencies['react-native-svg'],'QR dependencies must be installed');\n`;
}

fs.writeFileSync(appPath,app);
fs.writeFileSync(stringsPath,strings);
fs.writeFileSync(qaPath,qa);
console.log('Applied legal, privacy and authenticity integration to Trial and Plus shared UI.');
