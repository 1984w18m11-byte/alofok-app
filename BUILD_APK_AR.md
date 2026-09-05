# تحويل مشروع تقويم الأفق V2 إلى APK

## أسهل طريقة: Expo EAS Build
1. أنشئ حسابًا مجانيًا في Expo: https://expo.dev/signup
2. على كمبيوتر، فك ضغط المشروع وافتح Terminal داخل المجلد.
3. نفّذ:
   npm install
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build -p android --profile preview
4. عند انتهاء البناء سيظهر رابط تنزيل ملف APK.
5. انقل APK إلى هاتف Android واضغط عليه للتثبيت.

## ملاحظة
هذا الملف `eas.json` مهيأ بحيث profile اسمه preview ينتج APK وليس AAB.

## إذا طلب EAS Android package
استخدم:
com.horizon.calendar

## إذا طلب إنشاء Android keystore
اختر Generate new keystore، وسيقوم EAS بإنشائه وإدارته.
