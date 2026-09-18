import React from 'react';
import {Pressable,StyleSheet,Switch,Text,View} from 'react-native';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.90)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';

export function AdhkarHomeCard({kind,rtl,onPress}){
 const morning=kind==='morning';
 return <Pressable onPress={onPress} style={s.homeCard}>
  <View style={s.icon}><Text style={s.iconText}>{morning?'☀':'☾'}</Text></View>
  <View style={s.homeText}>
   <Text style={[s.homeTitle,{textAlign:rtl?'right':'left'}]}>
    {rtl?(morning?'أذكار الصباح':'أذكار المساء'):(morning?'Morning adhkar':'Evening adhkar')}
   </Text>
   <Text style={[s.homeHint,{textAlign:rtl?'right':'left'}]}>
    {rtl?(morning?'للقراءة — متاحة حتى 10:00 صباحًا':'للقراءة — متاحة حتى 12:00 ليلًا'):(morning?'Read now — until 10:00 AM':'Read now — until midnight')}
   </Text>
  </View>
  <Text style={s.chevron}>{rtl?'‹':'›'}</Text>
 </Pressable>
}

function Setting({rtl,title,hint,value,onChange}){
 return <View style={s.settingCard}>
  <View style={[s.settingRow,{flexDirection:rtl?'row-reverse':'row'}]}>
   <View style={s.settingText}>
    <Text style={[s.settingTitle,{textAlign:rtl?'right':'left'}]}>{title}</Text>
    <Text style={[s.settingHint,{textAlign:rtl?'right':'left'}]}>{hint}</Text>
   </View>
   <Switch
    value={Boolean(value)}
    onValueChange={onChange}
    trackColor={{false:'#38495B',true:'#A87B28'}}
    thumbColor={value?GOLD:'#E8EDF2'}
   />
  </View>
 </View>
}

export function AdhkarSettings({rtl,adhkar}){
 return <View style={s.settingsWrap}>
  <Setting
   rtl={rtl}
   title={rtl?'أذكار الصباح':'Morning adhkar'}
   hint={rtl?'تظهر بعد أذان الفجر وتختفي الساعة 10 صباحًا':'Appears after Fajr and expires at 10:00 AM'}
   value={adhkar.morningEnabled}
   onChange={adhkar.setMorningEnabled}
  />
  <Setting
   rtl={rtl}
   title={rtl?'تنبيه أذكار الصباح':'Morning adhkar reminder'}
   hint={rtl?'تنبيه بعد أذان الفجر':'Reminder after Fajr'}
   value={adhkar.morningAlert}
   onChange={adhkar.setMorningAlert}
  />
  <Setting
   rtl={rtl}
   title={rtl?'أذكار المساء':'Evening adhkar'}
   hint={rtl?'تظهر الساعة 9 مساءً وتختفي منتصف الليل':'Appears at 9:00 PM and expires at midnight'}
   value={adhkar.eveningEnabled}
   onChange={adhkar.setEveningEnabled}
  />
  <Setting
   rtl={rtl}
   title={rtl?'تنبيه أذكار المساء':'Evening adhkar reminder'}
   hint={rtl?'تنبيه الساعة 9:00 مساءً':'Reminder at 9:00 PM'}
   value={adhkar.eveningAlert}
   onChange={adhkar.setEveningAlert}
  />
 </View>
}

const s=StyleSheet.create({
 homeCard:{marginTop:12,minHeight:72,borderRadius:17,borderWidth:1,borderColor:'rgba(244,196,93,.55)',backgroundColor:'rgba(7,23,41,.90)',paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:12},
 icon:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(244,196,93,.12)',borderWidth:1,borderColor:GOLD,alignItems:'center',justifyContent:'center'},
 iconText:{fontSize:20,color:GOLD},
 homeText:{flex:1},
 homeTitle:{color:GOLD,fontSize:16,fontWeight:'900'},
 homeHint:{color:MUTED,fontSize:11,marginTop:4},
 chevron:{color:WHITE,fontSize:26,fontWeight:'700'},
 settingsWrap:{marginTop:10,gap:10},
 settingCard:{backgroundColor:CARD,borderRadius:16,borderWidth:1,borderColor:LINE,padding:14},
 settingRow:{alignItems:'center',gap:12},
 settingText:{flex:1},
 settingTitle:{color:WHITE,fontSize:15,fontWeight:'800'},
 settingHint:{color:MUTED,fontSize:11,lineHeight:17,marginTop:4}
});
