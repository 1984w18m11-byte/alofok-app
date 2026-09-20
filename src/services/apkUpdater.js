import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const APK_MIME='application/vnd.android.package-archive';
const PACKAGE_ID='com.alofok.trial';
const DOWNLOAD_KEY='@alofok/apk-download-v1';
const TARGET=`${FileSystem.documentDirectory}al-ufuq-update.apk`;

let activePromise=null;
const listeners=new Set();

function notify(progress){
  const value=Math.max(0,Math.min(1,Number(progress)||0));
  listeners.forEach(listener=>{try{listener(value)}catch(_){}});
}

async function readSaved(){
  try{
    const raw=await AsyncStorage.getItem(DOWNLOAD_KEY);
    return raw?JSON.parse(raw):null;
  }catch(_){return null}
}

async function launchInstaller(uri){
  const contentUri=await FileSystem.getContentUriAsync(uri);
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
}

async function runDownload(url){
  if(activePromise)return activePromise;
  activePromise=(async()=>{
    let saved=await readSaved();
    if(saved?.url!==url){
      saved=null;
      try{await FileSystem.deleteAsync(TARGET,{idempotent:true})}catch(_){}
      await AsyncStorage.removeItem(DOWNLOAD_KEY).catch(()=>{});
    }

    if(saved?.completedUri){
      const info=await FileSystem.getInfoAsync(saved.completedUri).catch(()=>({exists:false}));
      if(info?.exists){
        notify(1);
        await launchInstaller(saved.completedUri);
        await AsyncStorage.removeItem(DOWNLOAD_KEY).catch(()=>{});
        return saved.completedUri;
      }
    }

    if(saved?.progress)notify(saved.progress);
    let task;
    const onNativeProgress=progress=>{
      const total=Number(progress.totalBytesExpectedToWrite||saved?.total||0);
      const written=Number(progress.totalBytesWritten||0);
      const ratio=total>0?written/total:0;
      notify(ratio);
      const resumable=task?.savable?.();
      AsyncStorage.setItem(DOWNLOAD_KEY,JSON.stringify({
        url,
        progress:ratio,
        written,
        total,
        resumeData:resumable?.resumeData||null
      })).catch(()=>{});
    };

    task=FileSystem.createDownloadResumable(
      url,
      TARGET,
      {},
      onNativeProgress,
      saved?.resumeData||null
    );
    const result=saved?.resumeData?await task.resumeAsync():await task.downloadAsync();
    if(!result?.uri)throw new Error('DOWNLOAD_FAILED');

    notify(1);
    await AsyncStorage.setItem(DOWNLOAD_KEY,JSON.stringify({
      url,
      progress:1,
      completedUri:result.uri
    })).catch(()=>{});
    await launchInstaller(result.uri);
    await AsyncStorage.removeItem(DOWNLOAD_KEY).catch(()=>{});
    return result.uri;
  })().finally(()=>{activePromise=null});
  return activePromise;
}

export function subscribeToApkDownload(onProgress){
  if(typeof onProgress!=='function')return()=>{};
  listeners.add(onProgress);
  return()=>listeners.delete(onProgress);
}

export async function getPendingApkDownload(){
  const saved=await readSaved();
  return saved?.url?{url:saved.url,progress:Number(saved.progress)||0}:null;
}

export async function resumePendingApkDownload(onProgress){
  if(Platform.OS!=='android')return null;
  const pending=await getPendingApkDownload();
  if(!pending)return null;
  const unsubscribe=subscribeToApkDownload(onProgress);
  try{return await runDownload(pending.url)}
  finally{unsubscribe()}
}

export async function downloadAndInstallApk(url,onProgress){
  if(Platform.OS!=='android')throw new Error('ANDROID_ONLY');
  if(!url)throw new Error('MISSING_APK_URL');
  const unsubscribe=subscribeToApkDownload(onProgress);
  try{return await runDownload(url)}
  finally{unsubscribe()}
}
