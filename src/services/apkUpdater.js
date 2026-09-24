import {Linking,Platform} from 'react-native';

// Trial 1.0.17 browser-download fix:
// Do not download APK files inside the app. Hand the HTTPS URL to Chrome
// (with a normal browser fallback) and let Android/Chrome own the download.
function chromeIntent(url){
  const value=String(url||'').trim();
  if(!/^https?:\/\//i.test(value))return null;
  const scheme=value.toLowerCase().startsWith('https://')?'https':'http';
  const target=value.replace(/^https?:\/\//i,'');
  return `intent://${target}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(value)};end`;
}

async function openInBrowser(url){
  const value=String(url||'').trim();
  if(!value)throw new Error('MISSING_APK_URL');

  if(Platform.OS==='android'){
    const intent=chromeIntent(value);
    if(intent){
      try{
        await Linking.openURL(intent);
        return value;
      }catch(_){
        // Chrome may be unavailable; fall back to the user's default browser.
      }
    }
  }

  await Linking.openURL(value);
  return value;
}

export function subscribeToApkDownload(){
  return ()=>{};
}

export async function getPendingApkDownload(){
  // Browser/Android owns downloads now; the app keeps no partial-download state.
  return null;
}

export async function resumePendingApkDownload(){
  // No in-app download task exists to resume.
  return null;
}

export async function downloadAndInstallApk(url,onProgress){
  if(Platform.OS!=='android')throw new Error('ANDROID_ONLY');
  if(!url)throw new Error('MISSING_APK_URL');
  if(typeof onProgress==='function'){
    try{onProgress(0)}catch(_){}
  }
  const opened=await openInBrowser(url);
  if(typeof onProgress==='function'){
    try{onProgress(1)}catch(_){}
  }
  return opened;
}
