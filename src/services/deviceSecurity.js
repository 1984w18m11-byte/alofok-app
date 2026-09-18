import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

const DEVICE_SECRET_KEY='alufuq_device_secret_v1';
const ENTITLEMENTS_URL=process.env.EXPO_PUBLIC_PLUS_ENTITLEMENTS_URL||'https://raw.githubusercontent.com/1984w18m11-byte/alofok-app/main/plus-entitlements.json';
const PLUS_BUNDLE_URL=process.env.EXPO_PUBLIC_PLUS_BUNDLE_URL||'https://raw.githubusercontent.com/1984w18m11-byte/alofok-app/main/plus-bundle.json';
const PLUS_DIR=`${FileSystem.documentDirectory}alufuq-protected/`;
const PLUS_FILE=`${PLUS_DIR}plus.bundle.enc`;

function cleanCode(value){return String(value||'').trim().toUpperCase()}
function isExpired(value){
  if(!value)return false;
  const time=Date.parse(value);
  return Number.isFinite(time)&&time<=Date.now();
}
function bytesToCode(hex){
  const body=String(hex||'').replace(/[^a-f0-9]/gi,'').slice(0,16).toUpperCase().padEnd(16,'0');
  return `UFQ-${body.slice(0,4)}-${body.slice(4,8)}-${body.slice(8,12)}-${body.slice(12,16)}`;
}

export async function getDeviceSecret(){
  let encoded=await SecureStore.getItemAsync(DEVICE_SECRET_KEY);
  if(!encoded){
    const bytes=await Crypto.getRandomBytesAsync(32);
    encoded=naclUtil.encodeBase64(bytes);
    await SecureStore.setItemAsync(DEVICE_SECRET_KEY,encoded,{
      keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  }
  return {encoded,bytes:naclUtil.decodeBase64(encoded)};
}

export async function getDeviceCode(){
  const {encoded}=await getDeviceSecret();
  const digest=await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    encoded,
    {encoding:Crypto.CryptoEncoding.HEX}
  );
  return bytesToCode(digest);
}

async function fetchJson(url){
  const response=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{
    headers:{'Cache-Control':'no-cache','Accept':'application/json'}
  });
  if(!response.ok)throw new Error(`HTTP_${response.status}`);
  return response.json();
}

export async function checkPlusApproval(){
  const deviceCode=await getDeviceCode();
  try{
    const data=await fetchJson(ENTITLEMENTS_URL);
    const entries=Array.isArray(data)?data:(Array.isArray(data?.approved)?data.approved:[]);
    const match=entries.find(entry=>{
      if(typeof entry==='string')return cleanCode(entry)===deviceCode;
      return cleanCode(entry?.device_code||entry?.deviceCode||entry?.code)===deviceCode
        && String(entry?.tier||'plus').toLowerCase()==='plus'
        && !isExpired(entry?.expires_at||entry?.expiresAt);
    });
    if(!match)return {approved:false,deviceCode};
    const normalized=typeof match==='string'?{device_code:match,tier:'plus'}:match;
    return {
      approved:true,
      deviceCode,
      approvedAt:normalized.approved_at||normalized.approvedAt||null,
      expiresAt:normalized.expires_at||normalized.expiresAt||null
    };
  }catch(error){
    return {approved:false,deviceCode,offline:true,error:String(error?.message||error)};
  }
}

async function writeEncryptedBundle(bundle){
  const {bytes:key}=await getDeviceSecret();
  const deviceCode=await getDeviceCode();
  const nonce=await Crypto.getRandomBytesAsync(nacl.secretbox.nonceLength);
  const message=naclUtil.decodeUTF8(JSON.stringify({...bundle,deviceCode,storedAt:new Date().toISOString()}));
  const box=nacl.secretbox(message,nonce,key);
  const payload=JSON.stringify({
    v:1,
    alg:'XSalsa20-Poly1305',
    nonce:naclUtil.encodeBase64(nonce),
    box:naclUtil.encodeBase64(box)
  });
  await FileSystem.makeDirectoryAsync(PLUS_DIR,{intermediates:true});
  await FileSystem.writeAsStringAsync(PLUS_FILE,payload,{encoding:FileSystem.EncodingType.UTF8});
  return {ok:true,deviceCode};
}

export async function readEncryptedPlusBundle(){
  try{
    const info=await FileSystem.getInfoAsync(PLUS_FILE);
    if(!info.exists)return null;
    const raw=await FileSystem.readAsStringAsync(PLUS_FILE,{encoding:FileSystem.EncodingType.UTF8});
    const payload=JSON.parse(raw);
    const {bytes:key}=await getDeviceSecret();
    const nonce=naclUtil.decodeBase64(payload.nonce||'');
    const box=naclUtil.decodeBase64(payload.box||'');
    const opened=nacl.secretbox.open(box,nonce,key);
    if(!opened)return null;
    const data=JSON.parse(naclUtil.encodeUTF8(opened));
    const deviceCode=await getDeviceCode();
    if(cleanCode(data.deviceCode)!==deviceCode)return null;
    if(isExpired(data.expiresAt))return null;
    return data;
  }catch(_){
    return null;
  }
}

export async function prepareEncryptedPlusBundle(){
  const entitlement=await checkPlusApproval();
  if(!entitlement.approved)return {ok:false,reason:'not_approved',deviceCode:entitlement.deviceCode,offline:entitlement.offline};
  try{
    const remote=await fetchJson(PLUS_BUNDLE_URL);
    await writeEncryptedBundle({
      ...remote,
      tier:'plus',
      approvedAt:entitlement.approvedAt||null,
      expiresAt:entitlement.expiresAt||null
    });
    return {ok:true,deviceCode:entitlement.deviceCode,expiresAt:entitlement.expiresAt||null};
  }catch(error){
    return {ok:false,reason:'bundle_download_failed',deviceCode:entitlement.deviceCode,error:String(error?.message||error)};
  }
}

export async function unlockPlusForThisDevice(){
  const local=await readEncryptedPlusBundle();
  if(local?.tier==='plus')return {unlocked:true,source:'encrypted_local',bundle:local,deviceCode:local.deviceCode};
  const prepared=await prepareEncryptedPlusBundle();
  if(!prepared.ok)return {unlocked:false,...prepared};
  const bundle=await readEncryptedPlusBundle();
  return bundle?.tier==='plus'
    ?{unlocked:true,source:'approved_network',bundle,deviceCode:bundle.deviceCode}
    :{unlocked:false,reason:'encrypted_bundle_unreadable',deviceCode:prepared.deviceCode};
}

export async function clearProtectedPlusBundle(){
  try{await FileSystem.deleteAsync(PLUS_FILE,{idempotent:true})}catch(_){}
}

export const protectedPlusConfig={
  entitlementsUrl:ENTITLEMENTS_URL,
  plusBundleUrl:PLUS_BUNDLE_URL,
  protectedFile:PLUS_FILE
};
