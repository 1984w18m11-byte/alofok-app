const fs=require('fs');
const path='src/app/AppV3.js';
let app=fs.readFileSync(path,'utf8');

function replaceOnce(from,to,label){
 if(!app.includes(from))throw new Error(`Missing patch target: ${label}`);
 app=app.replace(from,to);
}

replaceOnce(
 " const [screen,setScreen]=useState('home');\n const [drawer,setDrawer]=useState(false);",
 " const [screen,setScreen]=useState('home');\n const [screenHistory,setScreenHistory]=useState([]);\n const [drawer,setDrawer]=useState(false);",
 'screen history state'
);

replaceOnce(
 "  if(!IS_PLUS&&id!=='trial-fixed'){setScreen('plus');return}\n",
 "  if(!IS_PLUS&&id!=='trial-fixed'){setScreenHistory(history=>[...history,'themes']);setScreen('plus');return}\n",
 'Plus gate history'
);

replaceOnce(
 " const navigate=useCallback(target=>{\n  setDrawer(false);\n  if(target==='support'){\n   Alert.alert(t('support'),SUPPORT_ACCOUNT?(rtl?`رقم الدعم: ${SUPPORT_ACCOUNT}`:`Support account: ${SUPPORT_ACCOUNT}`):(rtl?'سيُضاف رقم الدعم المعتمد داخل الإصدار النهائي.':'The verified support account will be added in the final release.'));return;\n  }\n  if(target==='update'){checkUpdate();return}\n  setScreen(target);\n },[t,rtl,checkUpdate]);\n const goHome=()=>setScreen('home');",
 " const navigate=useCallback(target=>{\n  setDrawer(false);\n  if(target==='support'){\n   Alert.alert(t('support'),SUPPORT_ACCOUNT?(rtl?`رقم الدعم: ${SUPPORT_ACCOUNT}`:`Support account: ${SUPPORT_ACCOUNT}`):(rtl?'سيُضاف رقم الدعم المعتمد داخل الإصدار النهائي.':'The verified support account will be added in the final release.'));return;\n  }\n  if(target==='update'){checkUpdate();return}\n  if(target===screen)return;\n  setScreenHistory(history=>[...history,screen]);\n  setScreen(target);\n },[t,rtl,checkUpdate,screen]);\n const goBack=useCallback(()=>{\n  setDrawer(false);\n  if(!screenHistory.length){setScreen('home');return}\n  const previous=screenHistory[screenHistory.length-1];\n  setScreenHistory(screenHistory.slice(0,-1));\n  setScreen(previous);\n },[screenHistory]);\n const goHome=useCallback(()=>{setDrawer(false);setScreenHistory([]);setScreen('home')},[]);",
 'navigation stack callbacks'
);

const routeReplacements=[
 ["if(screen==='adhan')return <AdhanScreen t={t} rtl={rtl} adhan={adhan} onBack={goHome}/>;","if(screen==='adhan')return <AdhanScreen t={t} rtl={rtl} adhan={adhan} onBack={goBack}/>;"],
 ["if(screen==='themes')return <ThemesScreen t={t} rtl={rtl} isPlus={IS_PLUS} selectedTheme={selectedTheme} setSelectedTheme={setSelectedTheme} onBack={goHome}/>;","if(screen==='themes')return <ThemesScreen t={t} rtl={rtl} isPlus={IS_PLUS} selectedTheme={selectedTheme} setSelectedTheme={setSelectedTheme} onBack={goBack}/>;"],
 ["if(screen==='plus')return <PlusScreen t={t} rtl={rtl} isPlus={IS_PLUS} onBack={goHome}/>;","if(screen==='plus')return <PlusScreen t={t} rtl={rtl} isPlus={IS_PLUS} onBack={goBack}/>;"],
 ["if(screen==='languages')return <LanguageScreen t={t} rtl={rtl} language={language} onChoose={chooseLanguage} onBack={goHome}/>;","if(screen==='languages')return <LanguageScreen t={t} rtl={rtl} language={language} onChoose={chooseLanguage} onBack={goBack}/>;"],
 ["if(screen==='about')return <AboutScreen t={t} rtl={rtl} onBack={goHome}/>;","if(screen==='about')return <AboutScreen t={t} rtl={rtl} onBack={goBack}/>;"],
 ["if(screen==='privacy')return <PrivacyScreen rtl={rtl} onBack={goHome} onNavigate={navigate}/>;","if(screen==='privacy')return <PrivacyScreen rtl={rtl} onBack={goBack} onNavigate={navigate}/>;"],
 ["if(screen==='copyright')return <CopyrightScreen rtl={rtl} onBack={()=>setScreen('privacy')}/>;","if(screen==='copyright')return <CopyrightScreen rtl={rtl} onBack={goBack}/>;"],
 ["if(screen==='authenticity')return <AuthenticityScreen rtl={rtl} onBack={()=>setScreen('privacy')} edition={IS_PLUS?'plus':'trial'} version={VERSION}/>;","if(screen==='authenticity')return <AuthenticityScreen rtl={rtl} onBack={goBack} edition={IS_PLUS?'plus':'trial'} version={VERSION}/>;"],
 ["if(screen==='advertise')return <AdvertiseScreen rtl={rtl} language={language} country={location.country} onBack={goHome}/>;","if(screen==='advertise')return <AdvertiseScreen rtl={rtl} language={language} country={location.country} onBack={goBack}/>;"],
 ["if(screen==='settings')return <SettingsScreen t={t} rtl={rtl} adhan={adhan} onNavigate={navigate} location={location} onBack={goHome}/>;","if(screen==='settings')return <SettingsScreen t={t} rtl={rtl} adhan={adhan} onNavigate={navigate} location={location} onBack={goBack}/>;"],
 ["if(screen==='cities')return <CitiesScreen t={t} rtl={rtl} location={location} onBack={()=>setScreen('settings')}/>;","if(screen==='cities')return <CitiesScreen t={t} rtl={rtl} location={location} onBack={goBack}/>;"]
];
for(const [from,to] of routeReplacements)replaceOnce(from,to,from.slice(0,45));

fs.writeFileSync(path,app);
console.log('Navigation back stack applied.');
