import React,{useCallback,useEffect,useState} from 'react';
import {Linking,Pressable,ScrollView,Text,View,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import {requestAuthenticityChallenge} from './authenticityClient';

const GOLD='#F4C45D';
const NAVY='#06182B';
const CARD='rgba(17,34,52,0.82)';
const LINE='rgba(255,255,255,0.15)';
const WHITE='#F7F8FB';
const MUTED='#B9C4D1';

function dir(rtl){return {textAlign:rtl?'right':'left',writingDirection:rtl?'rtl':'ltr'}}
function row(rtl){return {flexDirection:rtl?'row-reverse':'row'}}
function LegalHeader({title,onBack,rtl}){
 return <View style={[s.header,row(rtl)]}>
  <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
  <Text style={[s.title,dir(rtl)]}>{title}</Text><View style={s.spacer}/>
 </View>
}
function Card({title,children,rtl}){
 return <View style={s.card}><Text style={[s.cardTitle,dir(rtl)]}>{title}</Text>{children}</View>
}
function Paragraph({children,rtl}){return <Text style={[s.body,dir(rtl)]}>{children}</Text>}
function NavButton({label,onPress}){return <Pressable onPress={onPress} style={s.navButton}><Text style={s.navButtonText}>{label}</Text></Pressable>}

export function PrivacyScreen({rtl,onBack,onNavigate}){
 const ar=rtl;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <LegalHeader title={ar?'سياسة الخصوصية':'Privacy Policy'} onBack={onBack} rtl={rtl}/>
  <Text style={[s.updated,dir(rtl)]}>{ar?'آخر تحديث: 15 أيلول 2026':'Last updated: September 15, 2026'}</Text>
  <Card title={ar?'طبيعة التطبيق':'About the app'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'الأفق / AlofoK مشروع تقويمي وتقني وبحثي، وليس جهة دينية رسمية. صاحب المشروع وحقوقه الأصلية: وسام محمد — Wissam Digital. تعرض النسختان التجريبية وPlus التقويمات والمواقيت والمناسبات والخدمات المرتبطة بها بحسب الميزات المتاحة في كل نسخة.':'AlofoK is a calendar, technology and research project, not an official religious authority. Project owner and original-rights notice: Wissam Mohammed — Wissam Digital. Trial and Plus provide calendars, prayer times, events and related services according to the features available in each edition.'}</Paragraph></Card>
  <Card title={ar?'البيانات التي يستخدمها التطبيق':'Data used by the app'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'قد يستخدم التطبيق موقع الجهاز لحساب مواقيت الصلاة وتحديد الدولة أو المنطقة، ويحفظ محليًا تفضيلات مثل اللغة، المدينة، الثيم، صوت الأذان وإعدادات التنبيهات. عند استخدام التحقق من الأصالة قد يُرسل معرّف تثبيت عشوائي، نوع النسخة ورقم الإصدار إلى خادم التحقق، من دون إرسال الاسم أو رقم الهاتف أو رقم البطاقة لهذا الغرض.':'The app may use device location to calculate prayer times and determine the country or area. Preferences such as language, city, theme, Adhan sound and notification settings may be stored locally. When authenticity verification is used, a random installation identifier, edition and app version may be sent to the verification server; name, phone number and payment card number are not required for that verification.'}</Paragraph></Card>
  <Card title={ar?'الإنترنت والخدمات الخارجية':'Internet and external services'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'يُستخدم الإنترنت عند الحاجة لفحص التحديثات، جلب بعض بيانات المناسبات، تحميل خدمات تعتمد على الشبكة، أو طلب رمز تحقق من الأصالة. المواد الخارجية مثل تسجيلات الأذان تخضع لتراخيص مصادرها المذكورة في التطبيق أو ملفات الترخيص.':'Internet access is used when needed for update checks, some event data, network-based services, or requesting an authenticity challenge. Third-party materials such as Adhan recordings remain subject to their stated source licenses.'}</Paragraph></Card>
  <Card title={ar?'مشاركة البيانات وحمايتها':'Data sharing and protection'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'لا يبيع الأفق بيانات المستخدمين للمعلنين. نهدف إلى جمع أقل قدر ممكن من البيانات، مع الاعتماد على التخزين المحلي قدر الإمكان. لا يمكن ضمان حماية مطلقة لأي نظام رقمي، لذلك تُصمم الخدمات لتقليل البيانات الحساسة المخزنة أو المرسلة.':'AlofoK does not sell user data to advertisers. The app is designed to minimize data collection and rely on local storage where practical. No digital system can guarantee absolute security, so the services are designed to reduce sensitive data stored or transmitted.'}</Paragraph></Card>
  <Card title={ar?'تحكم المستخدم':'User controls'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'يمكن للمستخدم إيقاف إذن الموقع أو التنبيهات من إعدادات الجهاز، وتغيير تفضيلاته، وحذف بيانات التطبيق المحلية بحذف التطبيق أو مسح بياناته من إعدادات النظام.':'Users can disable location or notification permissions in device settings, change preferences, and remove locally stored app data by clearing app data or uninstalling the app.'}</Paragraph></Card>
  <Card title={ar?'التحديثات على السياسة':'Policy updates'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'قد تُحدَّث هذه السياسة عند إضافة خدمات جديدة أو تعديل طريقة عمل التطبيق. سيُعرض تاريخ آخر تحديث داخل هذه الصفحة.':'This policy may be updated when services are added or the app changes. The latest update date is shown on this page.'}</Paragraph></Card>
  <View style={s.actions}><NavButton label={ar?'حقوق الطبع والنشر والملكية الفكرية':'Copyright & intellectual property'} onPress={()=>onNavigate('copyright')}/><NavButton label={ar?'التحقق من أصالة النسخة':'Verify app authenticity'} onPress={()=>onNavigate('authenticity')}/></View>
 </ScrollView></SafeAreaView>
}

export function CopyrightScreen({rtl,onBack}){
 const ar=rtl;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <LegalHeader title={ar?'حقوق الطبع والنشر':'Copyright & IP'} onBack={onBack} rtl={rtl}/>
  <Card title={ar?'حقوق الأفق':'AlofoK rights'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'© 2026 وسام محمد — Wissam Digital — AlofoK / الأفق. جميع حقوق الطبع والنشر والملكية الفكرية محفوظة في الشفرة البرمجية الأصلية، تصميم الواجهات، الشعارات والأيقونات الأصلية، ترتيب المحتوى، النصوص والمواد التي أُنشئت خصيصًا للمشروع، وذلك إلى الحد الذي يسمح به القانون.':'© 2026 Wissam Mohammed — Wissam Digital — AlofoK. Copyright and intellectual-property rights are reserved in the original source code, interface design, original logos and icons, content arrangement, text and materials created specifically for the project, to the extent permitted by law.'}</Paragraph></Card>
  <Card title={ar?'المواد المرخصة من جهات أخرى':'Third-party licensed material'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'لا يدّعي الأفق ملكية المواد التي تعود لجهات أخرى. تسجيلات الأذان والصور أو البيانات المرخصة من مصادر خارجية تبقى خاضعة لحقوق أصحابها وشروط تراخيصها. كما لا يدّعي التطبيق ملكية النص القرآني أو الحقائق العامة أو المفاهيم التقويمية العامة بحد ذاتها.':'AlofoK does not claim ownership of third-party material. Licensed Adhan recordings, images or data remain subject to their owners and license terms. The app also does not claim ownership of Quranic text, public facts, or general calendar concepts themselves.'}</Paragraph></Card>
  <Card title={ar?'الاستخدام غير المصرح به':'Unauthorized use'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'يُحظر نسخ الشفرة أو إعادة توزيع التطبيق أو استنساخ تصميمه أو مواده الأصلية أو بيع نسخة معدلة منه دون إذن، إلا بالقدر الذي يسمح به القانون أو الترخيص المرفق بمادة خارجية محددة. يحتفظ صاحب المشروع بحق طلب إزالة النسخ المنتهكة واتخاذ الإجراءات المتاحة نظاميًا.':'Copying source code, redistributing the app, reproducing its original design or materials, or selling a modified copy without permission is prohibited except where permitted by law or by a specific third-party license. The project owner reserves the right to request removal of infringing copies and use available legal remedies.'}</Paragraph></Card>
  <Card title={ar?'علامات التحقق':'Verification markers'} rtl={rtl}><Paragraph rtl={rtl}>{ar?'قد تتضمن النسخة الرسمية معرّف تثبيت، رقم إصدار، رمز تحقق متغير أو QR قصير العمر مرتبط بخادم الأفق. هذه العلامات هدفها المساعدة في التحقق من أن النسخة المعروضة صادرة من القناة الرسمية، وليست ضمانًا قانونيًا منفردًا للملكية.':'The official app may include an installation identifier, version number, rotating verification code, or short-lived QR linked to the AlofoK verification server. These markers help verify that an app instance came from an official channel; they are not by themselves a legal guarantee of ownership.'}</Paragraph></Card>
 </ScrollView></SafeAreaView>
}

export function AuthenticityScreen({rtl,onBack,edition,version}){
 const ar=rtl;
 const [loading,setLoading]=useState(false);
 const [challenge,setChallenge]=useState(null);
 const [error,setError]=useState('');
 const issue=useCallback(async()=>{
  setLoading(true);setError('');
  try{setChallenge(await requestAuthenticityChallenge({edition,version}))}
  catch(e){setChallenge(null);setError(ar?'تعذر الحصول على رمز تحقق الآن. حاول مرة أخرى عند توفر الاتصال بخادم الأفق.':'Could not obtain a verification code. Try again when the AlofoK verification server is reachable.')}
  finally{setLoading(false)}
 },[edition,version,ar]);
 useEffect(()=>{issue()},[issue]);
 const copyCode=async()=>{if(challenge?.token)await Clipboard.setStringAsync(challenge.token)};
 const openVerify=async()=>{if(challenge?.verifyUrl)await Linking.openURL(challenge.verifyUrl)};
 const configured=Boolean(challenge?.configured);
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <LegalHeader title={ar?'التحقق من أصالة النسخة':'Verify authenticity'} onBack={onBack} rtl={rtl}/>
  <Card title={ar?'بيانات النسخة':'Edition details'} rtl={rtl}><Paragraph rtl={rtl}>{ar?`النسخة: ${edition==='plus'?'Plus':'تجريبية'}\nالإصدار: ${version}`:`Edition: ${edition==='plus'?'Plus':'Trial'}\nVersion: ${version}`}</Paragraph></Card>
  {!challenge?.configured&&!loading&&!error&&<View style={s.notice}><Text style={[s.noticeText,dir(rtl)]}>{ar?'نظام التحقق داخل التطبيق جاهز، لكنه ينتظر ربط عنوان خادم التحقق وصفحة الويب الرسمية. بعد الربط سيُصدر الخادم رمزًا جديدًا وQR قصير العمر كل مرة.':'The in-app verification flow is ready, but it is waiting for the official verification API and web page addresses. Once connected, the server will issue a fresh short-lived code and QR each time.'}</Text></View>}
  {loading&&<Text style={[s.status,dir(rtl)]}>{ar?'جاري طلب رمز جديد…':'Requesting a new code…'}</Text>}
  {!!error&&<Text style={[s.error,dir(rtl)]}>{error}</Text>}
  {configured&&challenge?.token&&<>
   {!!challenge.verifyUrl&&<View style={s.qrWrap}><QRCode value={challenge.verifyUrl} size={210} backgroundColor="#FFFFFF" color="#06182B"/></View>}
   <Text style={[s.codeLabel,dir(rtl)]}>{ar?'رمز التحقق':'Verification code'}</Text>
   <Text selectable style={s.code}>{challenge.token}</Text>
   {!!challenge.expiresAt&&<Text style={[s.expiry,dir(rtl)]}>{ar?'ينتهي: ':'Expires: '}{String(challenge.expiresAt)}</Text>}
   <View style={s.actions}><NavButton label={ar?'نسخ الرمز':'Copy code'} onPress={copyCode}/>{!!challenge.verifyUrl&&<NavButton label={ar?'فتح صفحة التحقق':'Open verification page'} onPress={openVerify}/>}</View>
  </>}
  <NavButton label={loading?(ar?'جاري الإصدار…':'Issuing…'):(ar?'إصدار رمز جديد':'Issue new code')} onPress={loading?()=>{}:issue}/>
  <Text style={[s.note,dir(rtl)]}>{ar?'عند ربط الخادم الرسمي: يكون كل رمز قصير العمر، ويقرر الخادم صلاحية الرمز وحالة النسخة، ويجب أن يرفض إعادة استعمال الرمز بعد التحقق. إذا لم يوجد جهاز ثانٍ يمكن نسخ الرقم الظاهر وفتحه في صفحة التحقق الرسمية من نفس الهاتف.':'When the official server is connected, each code should be short-lived. The server decides validity and app status and must reject reuse after verification. If a second device is not available, the visible code can be copied and entered on the official verification page from the same phone.'}</Text>
 </ScrollView></SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:NAVY},content:{padding:18,paddingBottom:50},header:{height:60,alignItems:'center',justifyContent:'space-between'},back:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:CARD,borderWidth:1,borderColor:LINE},backText:{color:WHITE,fontSize:30},title:{color:WHITE,fontSize:23,fontWeight:'900',flex:1,marginHorizontal:12},spacer:{width:44},updated:{color:MUTED,fontSize:11,marginVertical:4},card:{backgroundColor:CARD,borderWidth:1,borderColor:LINE,borderRadius:18,padding:15,marginTop:12},cardTitle:{color:GOLD,fontSize:17,fontWeight:'900',marginBottom:8},body:{color:'#E2E8EF',fontSize:13.5,lineHeight:22},actions:{gap:9,marginTop:12},navButton:{minHeight:48,borderRadius:16,borderWidth:1,borderColor:GOLD,alignItems:'center',justifyContent:'center',paddingHorizontal:14,marginTop:8,backgroundColor:'rgba(244,196,93,.08)'},navButtonText:{color:GOLD,fontSize:14,fontWeight:'900',textAlign:'center'},notice:{marginTop:14,padding:14,borderRadius:16,borderWidth:1,borderColor:GOLD,backgroundColor:'rgba(244,196,93,.10)'},noticeText:{color:'#FFE8B2',fontSize:13,lineHeight:21,fontWeight:'700'},status:{color:MUTED,fontSize:13,marginTop:16},error:{color:'#FFB4B4',fontSize:13,lineHeight:21,marginTop:14},qrWrap:{alignSelf:'center',backgroundColor:'#FFFFFF',padding:14,borderRadius:18,marginTop:18},codeLabel:{color:MUTED,fontSize:12,marginTop:15},code:{color:WHITE,fontSize:18,fontWeight:'900',letterSpacing:1.5,textAlign:'center',marginTop:8},expiry:{color:MUTED,fontSize:11,marginTop:8},note:{color:MUTED,fontSize:12,lineHeight:20,marginTop:16}
});
