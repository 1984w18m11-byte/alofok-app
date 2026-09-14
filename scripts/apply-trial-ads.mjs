import fs from 'node:fs';

function patch(path,fn){
 const before=fs.readFileSync(path,'utf8');
 const after=fn(before);
 if(after===before){console.log('no change',path);return}
 fs.writeFileSync(path,after);
 console.log('patched',path);
}
function need(text,needle,label){
 if(!text.includes(needle))throw new Error(`Missing patch anchor: ${label}`);
}

patch('src/app/AppV3.js',app=>{
 if(!app.includes("from './TrialAds';")){
  const anchor="import {AuthenticityScreen,CopyrightScreen,PrivacyScreen} from './LegalScreens';";
  need(app,anchor,'legal import');
  app=app.replace(anchor,`${anchor}\nimport {AdvertiseScreen,TrialAdOverlay,useTrialAd} from './TrialAds';`);
 }
 const oldItems="  ['⚙','settings','settings'],['⟳','checkUpdate','update'],['♛','subscription','plus'],['◉','support','support'],['◎','languages','languages'],['ⓘ','about','about'],['◇','privacy','privacy']";
 const newItems="  ['⚙','settings','settings'],['⟳','checkUpdate','update'],['♛','subscription','plus'],['◉','support','support'],...(!IS_PLUS?[['▣','advertise','advertise']]:[]),['◎','languages','languages'],['ⓘ','about','about'],['◇','privacy','privacy']";
 if(!app.includes("['▣','advertise','advertise']")){
  need(app,oldItems,'drawer items');
  app=app.replace(oldItems,newItems);
 }
 if(!app.includes('const trialAds=useTrialAd(')){
  const anchor=' const adhan=useAdhanAudio();';
  need(app,anchor,'adhan hook');
  app=app.replace(anchor,`${anchor}\n const trialAds=useTrialAd({enabled:!IS_PLUS,country:location.country,language});`);
 }
 if(!app.includes("screen==='advertise'")){
  const anchor=" if(screen==='settings')return <SettingsScreen t={t} rtl={rtl} adhan={adhan} onNavigate={navigate} location={location} onBack={goHome}/>;";
  need(app,anchor,'settings route');
  app=app.replace(anchor,` if(screen==='advertise')return <AdvertiseScreen rtl={rtl} language={language} country={location.country} onBack={goHome}/>;\n${anchor}`);
 }
 if(!app.includes('<TrialAdOverlay ad={trialAds.ad}')){
  const anchor="  {drawer&&<Drawer t={t} rtl={rtl} onClose={()=>setDrawer(false)} onNavigate={navigate} onUpdate={checkUpdate}/>} ";
  need(app,anchor,'drawer render');
  app=app.replace(anchor,`${anchor}\n  {!IS_PLUS&&<TrialAdOverlay ad={trialAds.ad} rtl={rtl} onClose={trialAds.dismiss} onOpen={trialAds.open}/>} `);
 }
 return app;
});

patch('src/app/v3Strings.js',strings=>{
 if(!strings.includes("advertise:'Advertise with us'")){
  const anchor="support:'Support',languages:'Languages'";
  need(strings,anchor,'English advertise key');
  strings=strings.replace(anchor,"support:'Support',advertise:'Advertise with us',languages:'Languages'");
 }
 if(!strings.includes("advertise:'أعلن معنا'")){
  const anchor="support:'الدعم',languages:'اللغات'";
  need(strings,anchor,'Arabic advertise key');
  strings=strings.replace(anchor,"support:'الدعم',advertise:'أعلن معنا',languages:'اللغات'");
 }
 return strings;
});

patch('scripts/release-qa.js',qa=>{
 if(qa.includes("MAX_WEEKLY_ADS=2"))return qa;
 const block=`\n// Trial advertising guards\nconst trialAds=read('src/app/TrialAds.js');\nassert(app.includes(\"from './TrialAds';\"),'trial advertising client must be wired into V3');\nassert(app.includes('useTrialAd({enabled:!IS_PLUS'),'ads must be disabled in Plus at the app boundary');\nassert(app.includes(\"...(!IS_PLUS?[['▣','advertise','advertise']]:[])\"),'Advertise menu entry must exist only in Trial');\nassert(trialAds.includes('MAX_WEEKLY_ADS=2'),'Trial must cap advertising at two impressions per week');\nassert(trialAds.includes('/v1/ads/approved/next'),'users must fetch only approved ads');\nassert(trialAds.includes(\"item.status!=='approved'\"),'client must reject any ad that is not approved');\nassert(trialAds.includes('/v1/ads/submissions'),'advertisers need a moderated submission endpoint');\nassert(trialAds.includes(\"status:'pending_review'\"),'new ad submissions must remain pending until manual approval');\nassert(trialAds.includes('EXPO_PUBLIC_AD_PAYMENT_URL'),'ad payment must use configurable provider routing, never a hardcoded card number');\n`;
 return qa+block;
});
