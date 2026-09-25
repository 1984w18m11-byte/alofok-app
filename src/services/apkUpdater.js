import {Linking,Platform} from 'react-native';

export async function downloadAndInstallApk(url){
  if(Platform.OS!=='android')throw new Error('ANDROID_ONLY');
  if(!url)throw new Error('MISSING_APK_URL');
  const supported=await Linking.canOpenURL(url);
  if(!supported)throw new Error('DOWNLOAD_URL_UNSUPPORTED');
  await Linking.openURL(url);
  return url;
}
