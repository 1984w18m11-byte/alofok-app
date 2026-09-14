const fs=require('fs');

function read(path){return fs.readFileSync(path,'utf8')}
function write(path,body){fs.writeFileSync(path,body)}
function replaceOnce(body,from,to,label){
  const first=body.indexOf(from);
  if(first<0)throw new Error(`Missing patch target: ${label}`);
  if(body.indexOf(from,first+from.length)>=0)throw new Error(`Patch target not unique: ${label}`);
  return body.slice(0,first)+to+body.slice(first+from.length);
}

// 1) Persist an in-app Adhan playback volume and apply it live to the current player.
{
  const path='src/app/useAdhanAudio.js';
  let body=read(path);
  body=replaceOnce(body,
"const ALERTS_KEY='alofok_v3_prayer_alerts';\n",
"const ALERTS_KEY='alofok_v3_prayer_alerts';\nconst VOLUME_KEY='alofok_v3_adhan_volume';\nconst DEFAULT_VOLUME=0.9;\n",
'volume storage constants');

  body=replaceOnce(body,
" const [alertsEnabled,setAlertsEnabled]=useState(false);\n const [playingId,setPlayingId]=useState(null);",
" const [alertsEnabled,setAlertsEnabled]=useState(false);\n const [volume,setVolumeState]=useState(DEFAULT_VOLUME);\n const [playingId,setPlayingId]=useState(null);",
'volume state');

  body=replaceOnce(body,
"  Promise.all([AsyncStorage.getItem(SELECTED_KEY),AsyncStorage.getItem(ALERTS_KEY)]).then(([id,alerts])=>{\n   if(id&&ADHAN_BY_ID[id])setSelectedId(id);\n   setAlertsEnabled(alerts==='1');\n  }).catch(()=>{});",
"  Promise.all([AsyncStorage.getItem(SELECTED_KEY),AsyncStorage.getItem(ALERTS_KEY),AsyncStorage.getItem(VOLUME_KEY)]).then(([id,alerts,savedVolume])=>{\n   if(id&&ADHAN_BY_ID[id])setSelectedId(id);\n   setAlertsEnabled(alerts==='1');\n   const parsed=Number(savedVolume);\n   if(Number.isFinite(parsed)&&parsed>=0&&parsed<=1)setVolumeState(parsed);\n  }).catch(()=>{});",
'load saved volume');

  body=replaceOnce(body,
" const preview=useCallback(async id=>{\n  const item=ADHAN_BY_ID[id];",
" const setVolume=useCallback(async value=>{\n  const numeric=Number(value);\n  const next=Number.isFinite(numeric)?Math.max(0,Math.min(1,numeric)):DEFAULT_VOLUME;\n  setVolumeState(next);\n  try{if(playerRef.current)playerRef.current.volume=next}catch(e){}\n  try{await AsyncStorage.setItem(VOLUME_KEY,String(next))}catch(e){}\n  return next;\n },[]);\n\n const preview=useCallback(async id=>{\n  const item=ADHAN_BY_ID[id];",
'live setVolume callback');

  body=replaceOnce(body,
"   const player=createAudioPlayer(item.audio);\n   player.volume=0.9;",
"   const player=createAudioPlayer(item.audio);\n   player.volume=volume;",
'preview volume');

  body=replaceOnce(body,
" },[stop]);\n\n const select=useCallback",
" },[stop,volume]);\n\n const select=useCallback",
'preview volume dependency');

  body=replaceOnce(body,
" return useMemo(()=>({catalog:ADHAN_CATALOG,selectedId,selected:ADHAN_BY_ID[selectedId],alertsEnabled,playingId,error,preview,stop,select,setPrayerAlerts,schedulePrayerAlerts}),[selectedId,alertsEnabled,playingId,error,preview,stop,select,setPrayerAlerts,schedulePrayerAlerts]);",
" return useMemo(()=>({catalog:ADHAN_CATALOG,selectedId,selected:ADHAN_BY_ID[selectedId],alertsEnabled,volume,playingId,error,preview,stop,select,setVolume,setPrayerAlerts,schedulePrayerAlerts}),[selectedId,alertsEnabled,volume,playingId,error,preview,stop,select,setVolume,setPrayerAlerts,schedulePrayerAlerts]);",
'expose volume API');
  write(path,body);
}

// 2) Add a working 0–100% volume control to the shared Adhan screen (Trial + Plus).
{
  const path='src/app/AppV3.js';
  let body=read(path);
  body=replaceOnce(body,
"  <View style={s.previewBox}><View style={[s.panelHeading,rowDir(rtl)]}><Text style={s.panelTitle}>{t('previewSound')}</Text><Text style={s.wave}>▂▅▃▇▆▂▅▃▂▁</Text></View><Text style={[s.adhanMeta,textDir(rtl)]}>{adhan.selected?(rtl?adhan.selected.display_ar:adhan.selected.display_en):t('notAvailable')}</Text></View>\n  {!!adhan.error&&<Text style={[s.errorText,textDir(rtl)]}>{t('audioError')}</Text>}",
"  <View style={s.previewBox}><View style={[s.panelHeading,rowDir(rtl)]}><Text style={s.panelTitle}>{t('previewSound')}</Text><Text style={s.wave}>▂▅▃▇▆▂▅▃▂▁</Text></View><Text style={[s.adhanMeta,textDir(rtl)]}>{adhan.selected?(rtl?adhan.selected.display_ar:adhan.selected.display_en):t('notAvailable')}</Text></View>\n  <View style={s.volumeBox}>\n   <View style={[s.volumeHeader,rowDir(rtl)]}><Text style={[s.volumeTitle,textDir(rtl)]}>{t('adhanVolume')}</Text><Text style={s.volumePercent}>{Math.round(adhan.volume*100)}%</Text></View>\n   <View style={s.volumeControls}>\n    <Pressable accessibilityLabel='Decrease Adhan volume' onPress={()=>adhan.setVolume(Math.max(0,Math.round((adhan.volume-0.1)*10)/10))} style={s.volumeButton}><Text style={s.volumeButtonText}>−</Text></Pressable>\n    <View style={s.volumeSegments}>{Array.from({length:10},(_,i)=>(i+1)/10).map(level=><Pressable accessibilityLabel={`Adhan volume ${Math.round(level*100)} percent`} key={level} onPress={()=>adhan.setVolume(level)} style={[s.volumeSegment,adhan.volume+0.001>=level&&s.volumeSegmentActive]}/>)}</View>\n    <Pressable accessibilityLabel='Increase Adhan volume' onPress={()=>adhan.setVolume(Math.min(1,Math.round((adhan.volume+0.1)*10)/10))} style={s.volumeButton}><Text style={s.volumeButtonText}>+</Text></Pressable>\n   </View>\n  </View>\n  {!!adhan.error&&<Text style={[s.errorText,textDir(rtl)]}>{t('audioError')}</Text>}",
'Adhan volume UI');

  body=replaceOnce(body,
"previewBox:{marginTop:18,padding:16,borderRadius:18,backgroundColor:CARD_2,borderWidth:1,borderColor:LINE},wave:{color:MUTED,fontSize:21,letterSpacing:2},errorText:{color:'#FFB4B4',marginTop:10,fontSize:12},",
"previewBox:{marginTop:18,padding:16,borderRadius:18,backgroundColor:CARD_2,borderWidth:1,borderColor:LINE},wave:{color:MUTED,fontSize:21,letterSpacing:2},volumeBox:{marginTop:12,padding:14,borderRadius:18,backgroundColor:CARD_2,borderWidth:1,borderColor:LINE},volumeHeader:{alignItems:'center',justifyContent:'space-between',marginBottom:12},volumeTitle:{color:WHITE,fontSize:14,fontWeight:'800',flex:1},volumePercent:{color:GOLD,fontSize:14,fontWeight:'900'},volumeControls:{flexDirection:'row',alignItems:'center',gap:9},volumeButton:{width:40,height:40,borderRadius:13,borderWidth:1,borderColor:GOLD_SOFT,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(244,196,93,.09)'},volumeButtonText:{color:GOLD,fontSize:24,fontWeight:'800'},volumeSegments:{flex:1,height:34,flexDirection:'row',alignItems:'center',gap:4},volumeSegment:{flex:1,height:10,borderRadius:5,backgroundColor:'rgba(255,255,255,.16)'},volumeSegmentActive:{backgroundColor:GOLD},errorText:{color:'#FFB4B4',marginTop:10,fontSize:12},",
'Adhan volume styles');
  write(path,body);
}

// 3) Localized label. Other language packs inherit the English fallback.
{
  const path='src/app/v3Strings.js';
  let body=read(path);
  body=replaceOnce(body,
"adhanTitle:'Adhan',adhanHint:'Choose your preferred Adhan',previewSound:'Preview sound',licensed:'Licensed'",
"adhanTitle:'Adhan',adhanHint:'Choose your preferred Adhan',previewSound:'Preview sound',adhanVolume:'Adhan volume',licensed:'Licensed'",
'English volume label');
  body=replaceOnce(body,
"adhanTitle:'تطبيق الأذان',adhanHint:'اختر صوت الأذان المفضل لديك',previewSound:'معاينة الصوت',licensed:'مرخص'",
"adhanTitle:'تطبيق الأذان',adhanHint:'اختر صوت الأذان المفضل لديك',previewSound:'معاينة الصوت',adhanVolume:'مستوى صوت الأذان',licensed:'مرخص'",
'Arabic volume label');
  write(path,body);
}

// 4) Guard the fix in release QA so later changes cannot silently break it.
{
  const path='scripts/release-qa.js';
  let body=read(path);
  body=replaceOnce(body,
"assert(app.includes('schedulePrayerAlerts'),'background prayer notification scheduling missing');\nassert(app.includes(\"return <View style={[s.prayerStrip,rowDir(rtl)]}>\"),'prayer strip must show all six times without horizontal scrolling');",
"assert(app.includes('schedulePrayerAlerts'),'background prayer notification scheduling missing');\nconst adhanHook=read('src/app/useAdhanAudio.js');\nassert(adhanHook.includes(\"const VOLUME_KEY='alofok_v3_adhan_volume';\"),'Adhan volume persistence missing');\nassert(adhanHook.includes('player.volume=volume'),'Adhan preview must use the selected volume');\nassert(adhanHook.includes('setVolumeState(next)')&&adhanHook.includes('playerRef.current.volume=next'),'Adhan volume must update live while audio is playing');\nassert(app.includes(\"t('adhanVolume')\")&&app.includes('adhan.setVolume(level)'),'Adhan volume control UI missing');\nassert(app.includes(\"return <View style={[s.prayerStrip,rowDir(rtl)]}>\"),'prayer strip must show all six times without horizontal scrolling');",
'volume QA guards');
  write(path,body);
}

console.log('Applied shared Trial/Plus Adhan volume fix.');
