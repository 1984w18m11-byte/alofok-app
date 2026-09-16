from pathlib import Path

# Payment/support flow: hide internal matching code from the user, but keep it in the copy event.
p=Path('src/app/PaymentTransfer.js')
s=p.read_text(encoding='utf-8')
start=s.index('export function PaymentTransferPanel')
prefix=s[:start]
component=r'''export function PaymentTransferPanel({rtl,purpose='support',edition='trial',amountIqd=null,eventName='payment_data_copied',notificationEndpoint=ADMIN_EVENT_ENDPOINT}){
 const [deviceCode,setDeviceCode]=useState('…');
 const [busy,setBusy]=useState('');

 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    let code=await AsyncStorage.getItem(DEVICE_CODE_KEY);
    if(!code){code=makeDeviceCode();await AsyncStorage.setItem(DEVICE_CODE_KEY,code)}
    if(active)setDeviceCode(code);
   }catch(e){if(active)setDeviceCode(makeDeviceCode())}
  })();
  return()=>{active=false};
 },[]);

 const postCopyEvent=async(destinationKind,copiedAt)=>{
  if(!notificationEndpoint)return false;
  try{
   const response=await fetch(notificationEndpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({event:eventName,purpose,edition,deviceCode,destinationKind,amountIqd:purpose==='plus'?amountIqd:null,copiedAt,timezoneOffsetMinutes:-new Date().getTimezoneOffset()})
   });
   return response.ok;
  }catch(e){return false}
 };

 const copyDestination=async(kind,value)=>{
  const clean=digits(value);
  if(!clean){
   Alert.alert(rtl?'بيانات التحويل غير مكتملة':'Transfer data incomplete',rtl?'رقم التحويل غير متوفر في هذا الإصدار.':'The transfer number is unavailable in this build.');
   return;
  }
  setBusy(kind);
  const copiedAt=new Date().toISOString();
  await Clipboard.setStringAsync(clean);
  await postCopyEvent(kind,copiedAt);
  setBusy('');
  Alert.alert(rtl?'تم النسخ':'Copied',rtl?'تم نسخ الرقم بنجاح. أكمل عملية التحويل من تطبيق الدفع.':'Number copied successfully. Complete the transfer in your payment app.');
 };

 return <View style={s.wrap}>
  <View style={s.card}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'التحويلات المالية':'Money transfer'}</Text>
   <Text style={[s.label,dir(rtl)]}>{rtl?'رقم التحويل — 16 رقم':'Transfer number — 16 digits'}</Text>
   <Text selectable style={s.number}>{CARD_NUMBER?formatCard(CARD_NUMBER):'•••• •••• •••• ••••'}</Text>
   <Pressable disabled={!!busy} onPress={()=>copyDestination('money_transfer_16',CARD_NUMBER)} style={[s.copyButton,busy&&s.disabled]}><Text style={s.copyText}>{busy==='money_transfer_16'?(rtl?'جاري النسخ…':'Copying…'):(rtl?'نسخ رقم التحويل':'Copy transfer number')}</Text></Pressable>
  </View>

  <View style={s.card}>
   <Text style={[s.optionTitle,dir(rtl)]}>{rtl?'الشراء عن طريق الموبايل':'Purchase by mobile'}</Text>
   <Text style={[s.label,dir(rtl)]}>{rtl?'رقم الحساب — 10 أرقام':'Account number — 10 digits'}</Text>
   <Text selectable style={s.number}>{ACCOUNT_NUMBER}</Text>
   <Pressable disabled={!!busy} onPress={()=>copyDestination('mobile_purchase_10',ACCOUNT_NUMBER)} style={[s.copyButton,busy&&s.disabled]}><Text style={s.copyText}>{busy==='mobile_purchase_10'?(rtl?'جاري النسخ…':'Copying…'):(rtl?'نسخ رقم الشراء':'Copy purchase number')}</Text></Pressable>
  </View>

  <Text style={[s.note,dir(rtl)]}>{rtl?'اختر الطريقة المناسبة لك ثم انسخ الرقم.':'Choose the method that suits you, then copy the number.'}</Text>
 </View>
}

const s=StyleSheet.create({wrap:{marginTop:4},card:{backgroundColor:CARD,borderRadius:18,borderWidth:1,borderColor:LINE,padding:16,marginTop:14},label:{color:MUTED,fontSize:12,marginTop:4},optionTitle:{color:GOLD,fontSize:16,fontWeight:'900'},number:{color:WHITE,fontSize:20,fontWeight:'900',textAlign:'center',letterSpacing:.7,marginVertical:14},copyButton:{backgroundColor:GOLD,borderRadius:14,paddingVertical:14,alignItems:'center'},copyText:{color:NAVY,fontSize:15,fontWeight:'900'},disabled:{opacity:.6},note:{color:MUTED,fontSize:12,lineHeight:19,marginTop:10}});
'''
p.write_text(prefix+component,encoding='utf-8')

# Keep the original fixed background in the visible seasonal theme list.
p=Path('src/app/themeCatalog.js')
s=p.read_text(encoding='utf-8')
s=s.replace("{id:'trial-fixed',group:'fixed'","{id:'trial-fixed',group:'seasons'",1)
p.write_text(s,encoding='utf-8')

# App UI: no Plus activation item in paid build, smaller drawer branding, fixed theme allowed in Trial.
p=Path('src/app/AppV3.js')
s=p.read_text(encoding='utf-8')
old=""" const items=[
  ['⚙','settings','settings'],['⟳','checkUpdate','update'],['♛','subscription','plus'],['◉','support','support'],...(!IS_PLUS?[['▣','advertise','advertise']]:[]),['◎','languages','languages'],['ⓘ','about','about'],['©','copyright','copyright'],['◇','privacy','privacy']
 ];"""
new=""" const items=[
  ['⚙','settings','settings'],['⟳','checkUpdate','update'],...(!IS_PLUS?[['♛','subscription','plus']]:[]),['◉','support','support'],...(!IS_PLUS?[['▣','advertise','advertise']]:[]),['◎','languages','languages'],['ⓘ','about','about'],['©','copyright','copyright'],['◇','privacy','privacy']
 ];"""
if old not in s:
    raise SystemExit('Drawer items block not found')
s=s.replace(old,new,1)
s=s.replace("if(!IS_PLUS&&!['season-spring','season-summer','season-autumn','season-winter'].includes(id))","if(!IS_PLUS&&!['trial-fixed','season-spring','season-summer','season-autumn','season-winter'].includes(id))",1)
s=s.replace("if(screen==='plus')return <PlusScreen t={t} rtl={rtl} isPlus={IS_PLUS} country={location.country} onBack={goBack}/>;","if(screen==='plus')return IS_PLUS?<SupportScreen rtl={rtl} edition='plus' onBack={goBack}/>:<PlusScreen t={t} rtl={rtl} isPlus={IS_PLUS} country={location.country} onBack={goBack}/>;",1)
oldstyle="drawerSafe:{flex:1,padding:22},drawerClose:{width:42,height:42,alignItems:'center',justifyContent:'center'},drawerCloseText:{color:WHITE,fontSize:34},drawerBrand:{alignItems:'center',marginTop:6,marginBottom:20},logoTile:{width:70,height:70,borderRadius:18,borderWidth:1.5,borderColor:GOLD,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(244,196,93,.10)'},logoTileText:{fontSize:34,color:GOLD},drawerAppName:{fontSize:28,color:GOLD,fontWeight:'900',marginTop:10},drawerTagline:{fontSize:13,color:GOLD_SOFT,marginTop:2},drawerLine:{height:1,backgroundColor:LINE,marginBottom:3},drawerItem:{height:58,alignItems:'center',gap:16"
newstyle="drawerSafe:{flex:1,padding:18},drawerClose:{width:40,height:40,alignItems:'center',justifyContent:'center'},drawerCloseText:{color:WHITE,fontSize:32},drawerBrand:{alignItems:'center',marginTop:0,marginBottom:11},logoTile:{width:52,height:52,borderRadius:14,borderWidth:1.5,borderColor:GOLD,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(244,196,93,.10)'},logoTileText:{fontSize:25,color:GOLD},drawerAppName:{fontSize:23,color:GOLD,fontWeight:'900',marginTop:5},drawerTagline:{fontSize:12,color:GOLD_SOFT,marginTop:1},drawerLine:{height:1,backgroundColor:LINE,marginBottom:2},drawerItem:{height:54,alignItems:'center',gap:16"
if oldstyle not in s:
    raise SystemExit('Drawer style block not found')
s=s.replace(oldstyle,newstyle,1)
p.write_text(s,encoding='utf-8')

# Final short support text.
p=Path('src/app/SupportScreen.js')
s=p.read_text(encoding='utf-8')
s=s.replace('وسائل التحويل الحالية مخصصة داخل العراق. اختر الرقم الذي يناسب طريقة تحويلك.','وسائل التحويل الحالية داخل العراق. اختر الطريقة المناسبة لك ثم انسخ الرقم.')
s=s.replace('Current transfer methods are for Iraq. Choose the number that matches your transfer method.','Current transfer methods are inside Iraq. Choose the method that suits you, then copy the number.')
p.write_text(s,encoding='utf-8')

# Private/internal matching endpoint in Wissam Digital worker analytics.
p=Path('wissam-digital-site/src/index.js')
s=p.read_text(encoding='utf-8')
marker="    if (url.pathname === '/api/track') {"
endpoint="""    if (url.pathname === '/api/payment-copy') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      let payload = {};
      try { payload = await request.json(); } catch (_) {}
      const destinationKind = clean(payload.destinationKind || '', 60);
      const deviceCode = clean(payload.deviceCode || '', 80);
      const purpose = clean(payload.purpose || '', 40);
      const edition = clean(payload.edition || '', 40);
      const copiedAt = clean(payload.copiedAt || '', 60);
      if (env.SITE_ANALYTICS) {
        env.SITE_ANALYTICS.writeDataPoint({
          indexes: ['payment_copy'],
          blobs: [destinationKind, deviceCode, purpose, edition, copiedAt, clean(request.cf?.country || 'Unknown', 8)],
          doubles: [1]
        });
      }
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

"""
if endpoint.strip() not in s:
    if marker not in s:
        raise SystemExit('Worker API anchor not found')
    s=s.replace(marker,endpoint+marker,1)
p.write_text(s,encoding='utf-8')

print('Applied final support, drawer and fixed-theme changes.')
