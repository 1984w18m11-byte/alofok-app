package com.wissamdigital.fahima;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import java.text.SimpleDateFormat;
import java.util.*;

public class MainActivity extends Activity {
    private LinearLayout root, messages;
    private ScrollView scroll;
    private EditText input;
    private TextView sceneLabel, modeLabel, avatar;
    private TextToSpeech tts;
    private SharedPreferences memory;
    private boolean deep=false;
    private int sceneIndex=0;
    private final String[] scenes={"غرفة هادئة","المطبخ","الحديقة","المكتب","الاستوديو","المختبر"};
    private final int[] sceneColors={0xFFF5EFE6,0xFFFFF3E0,0xFFEAF4E3,0xFFE8EEF7,0xFFF3E8F7,0xFFE8F6F6};

    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        memory=getSharedPreferences("fahima_memory",MODE_PRIVATE);
        tts=new TextToSpeech(this, status -> { if(status==TextToSpeech.SUCCESS) tts.setLanguage(new Locale("ar")); });
        buildUi();
        String last=memory.getString("last_message","");
        addFahima("هلا، أنا فهيمة. هذه النسخة التأسيسية الأولى: ذاكرة محلية، صوت، مشاهد، وضع سريع/عميق، وصلاحيات واضحة. القدرات السحابية المتقدمة تُربط بمحركاتها قبل اعتبارها مكتملة.");
        if(!last.isEmpty()) addSystem("آخر موضوع محفوظ: "+last);
    }

    private TextView text(String s,int size){
        TextView v=new TextView(this); v.setText(s); v.setTextSize(size); v.setTextColor(0xFF1F2933); v.setGravity(Gravity.RIGHT); v.setPadding(20,12,20,12); return v;
    }
    private Button button(String s){
        Button b=new Button(this); b.setText(s); b.setAllCaps(false); return b;
    }
    private void buildUi(){
        root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(18,18,18,18); root.setBackgroundColor(sceneColors[0]);
        TextView title=text("فهيمة  •  Fahima",24); title.setGravity(Gravity.CENTER); root.addView(title);
        avatar=text("●",86); avatar.setGravity(Gravity.CENTER); avatar.setTextColor(0xFF9A7B4F); root.addView(avatar,new LinearLayout.LayoutParams(-1,150));
        sceneLabel=text("المشهد: "+scenes[0],15); sceneLabel.setGravity(Gravity.CENTER); root.addView(sceneLabel);
        LinearLayout controls=new LinearLayout(this); controls.setGravity(Gravity.CENTER);
        Button scene=button("تغيير المكان"); modeLabel=button("Fast");
        Button privacy=button("الخصوصية");
        controls.addView(scene); controls.addView(modeLabel); controls.addView(privacy); root.addView(controls);
        scroll=new ScrollView(this); messages=new LinearLayout(this); messages.setOrientation(LinearLayout.VERTICAL); scroll.addView(messages);
        LinearLayout.LayoutParams sp=new LinearLayout.LayoutParams(-1,0,1); root.addView(scroll,sp);
        input=new EditText(this); input.setHint("احچي ويا فهيمة..."); input.setGravity(Gravity.RIGHT); input.setMinLines(2); input.setMaxLines(4); root.addView(input);
        LinearLayout actions=new LinearLayout(this); actions.setGravity(Gravity.CENTER);
        Button send=button("إرسال"); Button mic=button("🎙 صوت"); Button stop=button("قطع الصلاحيات");
        actions.addView(send); actions.addView(mic); actions.addView(stop); root.addView(actions);
        setContentView(root);

        scene.setOnClickListener(v->{ sceneIndex=(sceneIndex+1)%scenes.length; root.setBackgroundColor(sceneColors[sceneIndex]); sceneLabel.setText("المشهد: "+scenes[sceneIndex]); addSystem("انتقلت فهيمة إلى "+scenes[sceneIndex]); });
        modeLabel.setOnClickListener(v->{ deep=!deep; ((Button)modeLabel).setText(deep?"Deep":"Fast"); addSystem(deep?"الوضع العميق مفعّل":"الوضع السريع مفعّل"); });
        privacy.setOnClickListener(v->showPrivacy());
        stop.setOnClickListener(v->{ addSystem("تم إيقاف أي وصول حي داخل هذه النسخة. يمكنك أيضًا سحب أذونات المايك والكاميرا من إعدادات أندرويد."); });
        send.setOnClickListener(v->send());
        mic.setOnClickListener(v->startVoice());
    }

    private void send(){
        String q=input.getText().toString().trim(); if(q.isEmpty()) return;
        addUser(q); input.setText(""); memory.edit().putString("last_message",q).putLong("last_time",System.currentTimeMillis()).apply();
        String a=route(q);
        addFahima(a); speak(a);
    }
    private String route(String q){
        String x=q.toLowerCase(Locale.ROOT);
        if(x.contains("غناء")||x.contains("نوت")||x.contains("صوتي")||x.contains("مقام"))
            return "أتعامل مع هذا كتحليل صوت وموسيقى: النوتة، الطبقة، المجال الصوتي، الإيقاع والمقام. التحليل الدقيق لتسجيلك يحتاج محرك تحليل صوتي فعلي؛ لن أعطي نتيجة مزيفة قبل ربطه.";
        if(x.contains("مونتاج")||x.contains("فيديو"))
            return "أفهمه كمهمة فيديو ومونتاج: قص، دمج، نصوص، ترجمة، تعليق صوتي ومقاسات المنصات. هذه النسخة تنظّم المهمة، ومحرك التصدير المرئي يربط في مرحلة الوسائط.";
        if(x.contains("برمج")||x.contains("كود")||x.contains("خطأ"))
            return "مسار البرمجة مفعّل منطقيًا: تحليل المشكلة، خطة إصلاح، اختبار ثم تحقق. التنفيذ على المشاريع الخارجية يحتاج ربط أدوات GitHub وبيئة البناء.";
        if(x.contains("شبك")||x.contains("راوتر")||x.contains("صيانة")||x.contains("adb")||x.contains("fastboot"))
            return "أتعامل معها كصيانة وشبكات مصرح بها: تشخيص، إعدادات، ADB/Fastboot/Recovery عند توفر التفويض، بدون تجاوز حماية أو دخول غير مصرح.";
        if(x.contains("طبخ")||x.contains("دولمة")) return "نروح للمطبخ. أرتب المواد والخطوات وأشرحها عمليًا خطوة بخطوة.";
        if(x.contains("زرع")||x.contains("حديقة")) return "نروح للحديقة. أرتب التربة والبذور والسقي والعناية حسب النبات والجو.";
        if(x.contains("مشروع")||x.contains("ميزانية")||x.contains("اقتصاد")) return "أرتب الهدف، الميزانية، التكاليف، المخاطر والجدول الزمني، وأفصل الأرقام المؤكدة عن التقديرات.";
        if(x.contains("احفظ")||x.contains("تذكر")) { memory.edit().putString("note",q).apply(); return "حفظت الملاحظة محليًا في ذاكرة هذه النسخة."; }
        String note=memory.getString("note","");
        return (deep?"حللت طلبك بالمسار العميق. ":"") + "أنا فهيمة، أفهم طلبك ضمن سياق واحد بدون أقسام ظاهرة." + (note.isEmpty()?"":" وعندي ملاحظة محفوظة مرتبطة بذاكرتك.");
    }
    private void addUser(String s){ addBubble("أنت: "+s,0xFFFFFFFF); }
    private void addFahima(String s){ addBubble("فهيمة: "+s,0xFFFFF8E7); }
    private void addSystem(String s){ addBubble("• "+s,0xFFE9EEF3); }
    private void addBubble(String s,int color){
        TextView v=text(s,16); GradientDrawable g=new GradientDrawable(); g.setColor(color); g.setCornerRadius(24); v.setBackground(g);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2); p.setMargins(0,8,0,8); messages.addView(v,p);
        scroll.post(()->scroll.fullScroll(View.FOCUS_DOWN));
    }
    private void speak(String s){ if(tts!=null) tts.speak(s,TextToSpeech.QUEUE_FLUSH,null,"fahima"); }
    private void startVoice(){
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},44); return;
        }
        Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH); i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"ar-IQ"); i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        try{ startActivityForResult(i,55); }catch(Exception e){ addSystem("خدمة التعرف الصوتي غير متوفرة على هذا الجهاز."); }
    }
    @Override protected void onActivityResult(int r,int c,Intent d){
        super.onActivityResult(r,c,d);
        if(r==55&&c==RESULT_OK&&d!=null){ ArrayList<String> xs=d.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS); if(xs!=null&&!xs.isEmpty()){ input.setText(xs.get(0)); send(); } }
    }
    private void showPrivacy(){
        String mic=checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED?"مسموح":"غير مسموح";
        String cam=checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED?"مسموح":"غير مسموح";
        new android.app.AlertDialog.Builder(this).setTitle("لوحة الخصوصية").setMessage("المايك: "+mic+"\nالكاميرا: "+cam+"\n\nلا يتم فتح الكاميرا في هذه النسخة. الصوت يعمل فقط عند ضغط زر الصوت.").setPositiveButton("موافق",null).show();
    }
    @Override protected void onDestroy(){ if(tts!=null){tts.stop();tts.shutdown();} super.onDestroy(); }
}
