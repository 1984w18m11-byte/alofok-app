import fs from 'node:fs';

const appPath='src/app/AppV3.js';
const qaPath='scripts/release-qa.js';
let app=fs.readFileSync(appPath,'utf8');
let qa=fs.readFileSync(qaPath,'utf8');

const oldPrayer=`function PrayerStrip({times,t,rtl}){\n return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.prayerStrip}>\n  {PRAYER_KEYS.map(key=><View key={key} style={s.prayerItem}>\n   <Text style={[s.prayerIcon,key==='dhuhr'||key==='asr'?{color:GOLD}:null]}>{prayerIcon(key)}</Text>\n   <Text style={s.prayerName}>{t(key)}</Text><Text style={s.prayerTime}>{times[key]}</Text>\n  </View>)}\n </ScrollView>\n}`;

const newPrayer=`function PrayerStrip({times,t,rtl}){\n return <View style={[s.prayerStrip,rowDir(rtl)]}>\n  {PRAYER_KEYS.map(key=><View key={key} style={s.prayerItem}>\n   <Text style={[s.prayerIcon,key==='dhuhr'||key==='asr'?{color:GOLD}:null]}>{prayerIcon(key)}</Text>\n   <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={s.prayerName}>{t(key)}</Text>\n   <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={s.prayerTime}>{times[key]}</Text>\n  </View>)}\n </View>\n}`;

if(app.includes(oldPrayer))app=app.replace(oldPrayer,newPrayer);
else if(!app.includes("return <View style={[s.prayerStrip,rowDir(rtl)]}>"))throw new Error('PrayerStrip patch target not found');

const oldStyles="glassPanel:{backgroundColor:'rgba(7,23,41,.82)',borderColor:'rgba(244,196,93,.55)',borderWidth:1,borderRadius:20,padding:12,overflow:'hidden'},panelHeading:{alignItems:'center',justifyContent:'space-between',marginBottom:10},panelTitle:{fontSize:19,fontWeight:'800',color:GOLD},panelAction:{color:'#DCE3EC',fontSize:13},prayerStrip:{gap:5,paddingVertical:3},prayerItem:{width:74,minHeight:88,alignItems:'center',justifyContent:'center',borderRightWidth:StyleSheet.hairlineWidth,borderColor:LINE},prayerIcon:{color:WHITE,fontSize:21},prayerName:{color:WHITE,fontSize:12,fontWeight:'700',marginTop:4},prayerTime:{color:'#F2F3F5',fontSize:12,fontWeight:'700',marginTop:3},";
const newStyles="glassPanel:{backgroundColor:'rgba(7,23,41,.82)',borderColor:'rgba(244,196,93,.55)',borderWidth:1,borderRadius:18,padding:10,overflow:'hidden'},panelHeading:{alignItems:'center',justifyContent:'space-between',marginBottom:8},panelTitle:{fontSize:18,fontWeight:'800',color:GOLD},panelAction:{color:'#DCE3EC',fontSize:12},prayerStrip:{width:'100%',paddingVertical:1},prayerItem:{flex:1,minWidth:0,minHeight:72,alignItems:'center',justifyContent:'center',paddingHorizontal:1,borderRightWidth:StyleSheet.hairlineWidth,borderColor:LINE},prayerIcon:{color:WHITE,fontSize:17},prayerName:{color:WHITE,fontSize:10,fontWeight:'700',marginTop:3,textAlign:'center'},prayerTime:{color:'#F2F3F5',fontSize:10.5,fontWeight:'700',marginTop:2,textAlign:'center'},";

if(app.includes(oldStyles))app=app.replace(oldStyles,newStyles);
else if(!app.includes("prayerItem:{flex:1,minWidth:0,minHeight:72"))throw new Error('Prayer style patch target not found');

if(!qa.includes('prayer strip must show all six times without horizontal scrolling')){
 const marker="assert(app.includes('schedulePrayerAlerts'),'background prayer notification scheduling missing');";
 const addition=`${marker}\nassert(app.includes("return <View style={[s.prayerStrip,rowDir(rtl)]}>"),'prayer strip must show all six times without horizontal scrolling');\nassert(app.includes("prayerItem:{flex:1,minWidth:0,minHeight:72"),'prayer items must share the available width');`;
 if(!qa.includes(marker))throw new Error('QA insertion target not found');
 qa=qa.replace(marker,addition);
}

fs.writeFileSync(appPath,app);
fs.writeFileSync(qaPath,qa);
console.log('Applied compact six-prayer strip to both Trial and Plus shared UI.');
