import {Linking,Platform} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

export async function downloadAndInstallApk(url){
  if(Platform.OS!=='android')throw new Error('ANDROID_ONLY');
  if(!url)throw new Error('MISSING_APK_URL');

  // Direct APK links are handed to Android/Chrome so the system download can
  // continue independently of the app, including while the app is backgrounded.
  const supported=await Linking.canOpenURL(url);
  if(!supported)throw new Error('DOWNLOAD_URL_UNSUPPORTED');
  await Linking.openURL(url);
  return url;
}

export async function installDownloadedApk(fileUri){
  if(Platform.OS!=='android')throw new Error('ANDROID_ONLY');
  if(!fileUri)throw new Error('MISSING_APK_FILE');
  const contentUri=await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
    data:contentUri,
    flags:1,
    type:'application/vnd.android.package-archive'
  });
  return contentUri;
}
