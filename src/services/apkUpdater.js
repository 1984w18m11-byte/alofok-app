import {Linking,Platform} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

const CHROME_PACKAGE='com.android.chrome';

export async function downloadAndInstallApk(url){
  if(Platform.OS!=='android')throw new Error('ANDROID_ONLY');
  if(!url)throw new Error('MISSING_APK_URL');

  // Hand the APK URL to Chrome/system download. No in-app downloader or progress UI.
  try{
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
      data:url,
      packageName:CHROME_PACKAGE
    });
    return url;
  }catch(_){
    const supported=await Linking.canOpenURL(url);
    if(!supported)throw new Error('DOWNLOAD_URL_UNSUPPORTED');
    await Linking.openURL(url);
    return url;
  }
}
