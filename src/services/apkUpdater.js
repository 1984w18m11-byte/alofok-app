import {Platform} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const APK_MIME='application/vnd.android.package-archive';
const PACKAGE_ID='com.alofok.trial';

export async function downloadAndInstallApk(url,onProgress){
  if(Platform.OS!=='android')throw new Error('ANDROID_ONLY');
  if(!url)throw new Error('MISSING_APK_URL');
  const target=`${FileSystem.cacheDirectory}al-ufuq-update.apk`;
  try{await FileSystem.deleteAsync(target,{idempotent:true})}catch(_){}
  const task=FileSystem.createDownloadResumable(url,target,{},progress=>{
    const total=Number(progress.totalBytesExpectedToWrite||0);
    const written=Number(progress.totalBytesWritten||0);
    if(total>0&&onProgress)onProgress(Math.max(0,Math.min(1,written/total)));
  });
  const result=await task.downloadAsync();
  if(!result?.uri)throw new Error('DOWNLOAD_FAILED');
  const contentUri=await FileSystem.getContentUriAsync(result.uri);
  try{
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
      data:contentUri,
      flags:1,
      type:APK_MIME
    });
  }catch(error){
    try{
      await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES',{
        data:`package:${PACKAGE_ID}`
      });
    }catch(_){}
    throw new Error('INSTALL_PERMISSION_REQUIRED');
  }
  return result.uri;
}
