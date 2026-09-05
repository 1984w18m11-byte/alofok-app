
# Android V2
المصدر: React Native / Expo.
الإعدادات الرئيسية في app.json تحت expo.android.
للإصدار الإنتاجي:
- POST_NOTIFICATIONS.
- الموقع الدقيق/التقريبي.
- exact alarms عند الحاجة وبما يتوافق مع سياسة Google Play.
- Android 17: الأذان الكامل بالخلفية يحتاج تصميم Native لاستخدام alarm audio/foreground service بطريقة متوافقة.
- ملفات الأذان لا تضاف إلا بعد إثبات الترخيص.
