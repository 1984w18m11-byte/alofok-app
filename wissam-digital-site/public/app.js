// رقم واتساب الأعمال لا يظهر في واجهة الموقع. عند إضافته هنا يفتح الزر المحادثة مباشرة.
const WHATSAPP_NUMBER = '';

const body=document.body;
const langBtn=document.getElementById('langBtn');
if(langBtn){
  langBtn.addEventListener('click',()=>{
    const en=body.classList.toggle('en');
    document.documentElement.lang=en?'en':'ar';
    document.documentElement.dir=en?'ltr':'rtl';
    langBtn.textContent=en?'العربية':'English';
  });
}

document.querySelectorAll('.servicePick').forEach(link=>link.addEventListener('click',()=>{
  const subject=document.getElementById('subject');
  if(subject)subject.value=link.dataset.service||'';
}));

const params=new URLSearchParams(location.search);
function detectSource(){
  const explicit=(params.get('src')||params.get('source')||'').trim();
  if(explicit)return explicit;
  const ref=document.referrer.toLowerCase();
  if(ref.includes('facebook.com')||ref.includes('fb.com'))return 'Facebook';
  if(ref.includes('instagram.com'))return 'Instagram';
  if(ref.includes('tiktok.com'))return 'TikTok';
  if(ref.includes('youtube.com')||ref.includes('youtu.be'))return 'YouTube';
  if(ref.includes('google.'))return 'Google';
  return ref?'Referral':'Direct';
}

function getSessionId(){
  const key='wissam_digital_session_v1';
  try{
    let id=sessionStorage.getItem(key);
    if(!id){
      id=(crypto.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(key,id);
    }
    return id;
  }catch(_){
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

const analyticsSessionId=getSessionId();
const analyticsSource=detectSource();
function trackEvent(event,extra={}){
  const payload={
    event,
    path:location.pathname,
    source:analyticsSource,
    sessionId:analyticsSessionId,
    ...extra
  };
  try{
    fetch('/api/track',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      keepalive:true
    }).catch(()=>{});
  }catch(_){}
}

trackEvent('page_view');

document.querySelectorAll('[data-track="app_explainer_open"]').forEach(link=>{
  link.addEventListener('click',()=>trackEvent('app_explainer_open',{
    app:link.dataset.app||'',
    edition:link.dataset.edition||''
  }));
});

const alofokDownload=document.getElementById('alofokTrialDownload');
if(alofokDownload){
  const q=new URLSearchParams({sid:analyticsSessionId,src:analyticsSource});
  alofokDownload.href=`/download/alofok-trial?${q.toString()}`;
}

const requestForm=document.getElementById('requestForm');
if(requestForm){
  requestForm.addEventListener('submit',e=>{
    e.preventDefault();
    const subject=document.getElementById('subject').value.trim();
    const details=document.getElementById('details').value.trim();
    const source=detectSource();
    const msg=`مرحباً وسام ديجيتال 👋\nلدي طلب جديد\nالموضوع: ${subject}\nالمطلوب: ${details}\nالمصدر: ${source}`;
    const target=WHATSAPP_NUMBER
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    const notice=document.getElementById('contactNotice');
    if(notice){
      notice.style.display='block';
      notice.textContent='سيتم فتح واتساب لإرسال رسالة نصية فقط.';
    }
    location.href=target;
  });
}
