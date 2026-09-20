import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import {
  completeHandler,
  createDownloadTask,
  directories,
  getExistingDownloadTasks,
  setConfig
} from '@kesha-antonov/react-native-background-downloader';

const APK_MIME='application/vnd.android.package-archive';
const PACKAGE_ID='com.alofok.trial';
const DOWNLOAD_KEY='@alofok/apk-background-download-v2';
const LEGACY_DOWNLOAD_KEY='@alofok/apk-download-v1';
const TASK_ID='alofok-apk-update-v2';
const TARGET_PATH=`${directories.documents}/al-ufuq-update.apk`;

setConfig({
  progressInterval:750,
  progressMinBytes:262144,
  showNotificationsEnabled:false,
  isLogsEnabled:false
});

let activePromise=null;
let activeUrl=null;
let activeTask=null;
const listeners=new Set();

function clampProgress(progress){
  return Math.max(0,Math.min(1,Number(progress)||0));
}

function notify(progress){
  const value=clampProgress(progress);
  listeners.forEach(listener=>{try{listener(value)}catch(_){}});
}

function asFileUri(path){
  const value=String(path||'');
  if(!value)return '';
  return value.startsWith('file://')?value:`file://${value}`;
}

async function readSaved(){
  try{
    const raw=await AsyncStorage.getItem(DOWNLOAD_KEY);
    return raw?JSON.parse(raw):null;
  }catch(_){return null}
}

async function writeSaved(patch){
  try{
    const previous=await readSaved()||{};
    await AsyncStorage.setItem(DOWNLOAD_KEY,JSON.stringify({
      ...previous,
      ...patch,
      updatedAt:Date.now()
    }));
  }catch(_){}
}

async function clearSaved(){
  await AsyncStorage.removeItem(DOWNLOAD_KEY).catch(()=>{});
}

async function fileExists(pathOrUri){
  if(!pathOrUri)return false;
  const info=await FileSystem.getInfoAsync(asFileUri(pathOrUri)).catch(()=>({exists:false}));
  return Boolean(info?.exists);
}

async function deleteTarget(){
  try{await FileSystem.deleteAsync(asFileUri(TARGET_PATH),{idempotent:true})}catch(_){}
}

async function launchInstaller(pathOrUri){
  const fileUri=asFileUri(pathOrUri);
  if(!fileUri)throw new Error('MISSING_APK_FILE');
  const contentUri=await FileSystem.getContentUriAsync(fileUri);
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

async function getNativeTask(){
  try{
    const tasks=await getExistingDownloadTasks();
    return tasks.find(task=>task.id===TASK_ID)||null;
  }catch(_){return null}
}

function getTaskUrl(task,fallback=null){
  return task?.downloadParams?.url||task?.metadata?.url||fallback||null;
}

function progressFromTask(task,fallback=0){
  const downloaded=Number(task?.bytesDownloaded||0);
  const total=Number(task?.bytesTotal||0);
  return total>0?clampProgress(downloaded/total):clampProgress(fallback);
}

async function stopNativeTask(task){
  if(!task)return;
  try{await task.stop()}catch(_){}
}

async function installCompleted(url,location,written=0,total=0){
  const finalPath=location||TARGET_PATH;
  const finalUri=asFileUri(finalPath);
  if(!(await fileExists(finalUri)))throw new Error('DOWNLOAD_FILE_MISSING');

  notify(1);
  await writeSaved({
    taskId:TASK_ID,
    url,
    progress:1,
    written:Number(written)||Number(total)||0,
    total:Number(total)||Number(written)||0,
    completedUri:finalUri,
    error:null
  });

  try{
    await launchInstaller(finalUri);
    await clearSaved();
    await AsyncStorage.removeItem(LEGACY_DOWNLOAD_KEY).catch(()=>{});
    return finalUri;
  }finally{
    try{completeHandler(TASK_ID)}catch(_){}
  }
}

function attachTaskHandlers(task,url,resolve,reject){
  task
    .begin(({expectedBytes})=>{
      const total=Number(expectedBytes)||0;
      writeSaved({
        taskId:TASK_ID,
        url,
        progress:progressFromTask(task,0),
        written:Number(task?.bytesDownloaded)||0,
        total:total>0?total:Number(task?.bytesTotal)||0,
        completedUri:null,
        error:null
      });
    })
    .progress(({bytesDownloaded,bytesTotal})=>{
      const written=Number(bytesDownloaded)||0;
      const total=Number(bytesTotal)||0;
      const ratio=total>0?clampProgress(written/total):progressFromTask(task,0);
      notify(ratio);
      writeSaved({
        taskId:TASK_ID,
        url,
        progress:ratio,
        written,
        total,
        completedUri:null,
        error:null
      });
    })
    .done(({location,bytesDownloaded,bytesTotal})=>{
      (async()=>{
        try{
          const uri=await installCompleted(url,location,bytesDownloaded,bytesTotal);
          resolve(uri);
        }catch(error){
          reject(error);
        }
      })();
    })
    .error(({error,errorCode})=>{
      const message=String(error||errorCode||'DOWNLOAD_FAILED');
      writeSaved({
        taskId:TASK_ID,
        url,
        progress:progressFromTask(task,0),
        written:Number(task?.bytesDownloaded)||0,
        total:Number(task?.bytesTotal)||0,
        error:message
      });
      reject(new Error(message));
    });
  return task;
}

async function prepareForUrl(url){
  let saved=await readSaved();
  let nativeTask=await getNativeTask();
  const nativeUrl=getTaskUrl(nativeTask,saved?.url);

  if(nativeTask&&nativeUrl&&nativeUrl!==url){
    await stopNativeTask(nativeTask);
    nativeTask=null;
  }

  if(saved?.url&&saved.url!==url){
    await clearSaved();
    saved=null;
  }

  if(!nativeTask&&!saved){
    await deleteTarget();
  }

  await AsyncStorage.removeItem(LEGACY_DOWNLOAD_KEY).catch(()=>{});
  return {saved,nativeTask};
}

async function runDownload(url){
  if(activePromise&&activeUrl===url)return activePromise;
  if(activePromise&&activeUrl!==url){
    throw new Error('ANOTHER_DOWNLOAD_ACTIVE');
  }

  activeUrl=url;
  activePromise=(async()=>{
    const {saved,nativeTask:initialTask}=await prepareForUrl(url);

    if(saved?.completedUri&&await fileExists(saved.completedUri)){
      return installCompleted(url,saved.completedUri,saved.written,saved.total);
    }

    if(saved?.progress)notify(saved.progress);

    let task=initialTask||await getNativeTask();
    if(task&&getTaskUrl(task,url)!==url){
      await stopNativeTask(task);
      task=null;
    }

    if(task?.state==='DONE'){
      return installCompleted(
        url,
        task?.downloadParams?.destination||TARGET_PATH,
        task?.bytesDownloaded,
        task?.bytesTotal
      );
    }

    if(task?.state==='FAILED'||task?.state==='STOPPED'){
      await stopNativeTask(task);
      task=null;
      await deleteTarget();
      await clearSaved();
    }

    return await new Promise(async(resolve,reject)=>{
      try{
        if(!task){
          task=createDownloadTask({
            id:TASK_ID,
            url,
            destination:TARGET_PATH,
            metadata:{kind:'alofok-apk-update',url},
            isAllowedOverMetered:true,
            isAllowedOverRoaming:true,
            maxRedirects:10
          });
          activeTask=task;
          attachTaskHandlers(task,url,resolve,reject);
          await writeSaved({
            taskId:TASK_ID,
            url,
            progress:0,
            written:0,
            total:0,
            completedUri:null,
            error:null
          });
          task.start();
          return;
        }

        activeTask=task;
        attachTaskHandlers(task,url,resolve,reject);
        const currentProgress=progressFromTask(task,saved?.progress||0);
        notify(currentProgress);
        await writeSaved({
          taskId:TASK_ID,
          url,
          progress:currentProgress,
          written:Number(task?.bytesDownloaded)||Number(saved?.written)||0,
          total:Number(task?.bytesTotal)||Number(saved?.total)||0,
          completedUri:null,
          error:null
        });

        if(task.state==='PAUSED')await task.resume();
        else if(task.state==='PENDING')task.start();
      }catch(error){
        reject(error);
      }
    });
  })().finally(()=>{
    activePromise=null;
    activeUrl=null;
    activeTask=null;
  });

  return activePromise;
}

export function subscribeToApkDownload(onProgress){
  if(typeof onProgress!=='function')return()=>{};
  listeners.add(onProgress);
  return()=>listeners.delete(onProgress);
}

export async function getPendingApkDownload(){
  if(Platform.OS!=='android')return null;

  const saved=await readSaved();
  const task=await getNativeTask();
  if(task){
    const url=getTaskUrl(task,saved?.url);
    if(url){
      const progress=task.state==='DONE'?1:progressFromTask(task,saved?.progress||0);
      return {url,progress,state:task.state};
    }
  }

  if(saved?.url){
    if(saved.completedUri&&!(await fileExists(saved.completedUri))){
      await clearSaved();
      return null;
    }
    return {
      url:saved.url,
      progress:clampProgress(saved.progress),
      state:saved.completedUri?'DONE':'PENDING'
    };
  }

  return null;
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
