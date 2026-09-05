
# بناء نسختي Android وiPhone

هذا المشروع Cross-platform؛ نفس المصدر يبني التطبيقين.

## Android
- يحتاج Android Studio/SDK أو EAS Build.
- للأذان الدقيق استخدم exact alarms عند كون التنبيه الدقيق وظيفة أساسية وبما يتوافق مع سياسة المتجر.
- Android 17 يفرض قيوداً أقوى على الصوت في الخلفية؛ التنفيذ النهائي للأذان الكامل يحتاج native alarm/foreground-service design واختبار API 37.

## iPhone
- يحتاج macOS + Xcode أو EAS Build.
- أصوات Notification المخصصة أقل من 30 ثانية.
- للأذان الأطول، لا تعتمد على notification sound وحده؛ يلزم تصميم تجربة متوافقة مع قيود iOS.

## ملاحظة
لا يوجد APK/IPA موقّع في هذا ZIP لأن التوقيع يحتاج حسابات Apple/Google وشهادات ومفاتيح خاصة بصاحب المشروع.
