import React from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import adhkar from '../data/adhkar.json';

const NAVY='#06182B';
const CARD='rgba(17,34,52,0.90)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const GOLD='#F4C45D';
const MUTED='#B9C4D1';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}

export function AdhkarScreen({kind='morning',rtl,onBack,onComplete}){
 const morning=kind==='morning';
 const rows=morning?adhkar.morning:adhkar.evening;
 const title=rtl?(morning?'أذكار الصباح':'أذكار المساء'):(morning?'Morning adhkar':'Evening adhkar');
 const hint=rtl
  ?(morning?'تظهر أذكار الصباح بعد الفجر وحتى الساعة 10 صباحًا، أو تختفي بعد إتمام القراءة.':'تظهر أذكار المساء من الساعة 9 مساءً وحتى منتصف الليل، أو تختفي بعد إتمام القراءة.')
  :(morning?'Morning adhkar remain available after Fajr until 10:00 AM, or until you finish reading.':'Evening adhkar remain available from 9:00 PM until midnight, or until you finish reading.');
 return <SafeAreaView style={s.safe}>
  <ScrollView contentContainerStyle={s.content}>
   <View style={s.header}>
    <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>{rtl?'›':'‹'}</Text></Pressable>
    <Text style={[s.title,dir(rtl)]}>{title}</Text>
    <View style={s.spacer}/>
   </View>
   <Text style={[s.hint,dir(rtl)]}>{hint}</Text>
   {rows.map((item,index)=><View key={item.id} style={s.card}>
    <View style={s.cardTop}>
     <Text style={[s.cardTitle,dir(rtl)]}>{rtl?('ذكر '+(index+1)):('Dhikr '+(index+1))}</Text>
     <View style={s.count}><Text style={s.countText}>{rtl?(item.count+'×'):('×'+item.count)}</Text></View>
    </View>
    <Text style={[s.text,dir(rtl)]}>{rtl?item.ar:item.en}</Text>
    {!!item.source&&<Text style={[s.source,dir(rtl)]}>{item.source}</Text>}
   </View>)}
   <Pressable onPress={onComplete} style={s.done}><Text style={s.doneText}>{rtl?'تمت القراءة وإخفاء الأذكار':'Finished reading & hide'}</Text></Pressable>
  </ScrollView>
 </SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:NAVY},
 content:{padding:18,paddingBottom:44},
 header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(4,20,37,.58)',borderWidth:1,borderColor:LINE},
 backText:{color:WHITE,fontSize:30},
 title:{color:WHITE,fontSize:24,fontWeight:'900',flex:1,marginHorizontal:12},
 spacer:{width:44},
 hint:{color:MUTED,fontSize:13,lineHeight:21,marginVertical:8},
 card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:15,marginTop:12},
 cardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 cardTitle:{color:GOLD,fontSize:15,fontWeight:'900',flex:1},
 count:{minWidth:40,height:30,borderRadius:15,backgroundColor:'rgba(244,196,93,.13)',borderWidth:1,borderColor:'rgba(244,196,93,.45)',alignItems:'center',justifyContent:'center'},
 countText:{color:GOLD,fontSize:12,fontWeight:'900'},
 text:{color:WHITE,fontSize:17,lineHeight:31,marginTop:12},
 source:{color:MUTED,fontSize:10,marginTop:10},
 done:{height:50,borderRadius:15,backgroundColor:GOLD,alignItems:'center',justifyContent:'center',marginTop:18},
 doneText:{color:NAVY,fontSize:15,fontWeight:'900'}
});
