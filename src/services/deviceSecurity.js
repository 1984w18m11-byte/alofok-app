import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

const DEVICE_SECRET_KEY='alufuq_device_secret_v1';
const PLUS_API_BASE=(process.env.EXPO_PUBLIC_PLUS_API_BASE||'https://wispy-salad-438b.wissamdigital11.workers.dev').replace(/\/$/,'');
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

async function digestToDeviceCode(seed){
  const digest=await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    String(seed||''),
    {encoding:Crypto.CryptoEncoding.HEX}
  );
  return bytesToCode(digest);
}

export async function getLegacyDeviceCode(){
  const {encoded}=await getDeviceSecret();
  return digestToDeviceCode(encoded);
}

export async function getDeviceIdentity(){
  try{
    const androidId=Application.getAndroidId();
    if(androidId){
      const deviceCode=await digestToDeviceCode(`alofok-device-v2|${androidId}`);
      const legacyDeviceCode=await getLegacyDeviceCode();
      return {deviceCode,legacyDeviceCode,source:'android_id'};
    }
  }catch(_){}
  const legacyDeviceCode=await getLegacyDeviceCode();
  return {deviceCode:legacyDeviceCode,legacyDeviceCode,source:'legacy_fallback'};
}

export async function getDeviceCode(){
  return (await getDeviceIdentity()).deviceCode;
}

async function fetchJson(url){
  const response=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{
    headers:{'Cache-Control':'no-cache','Accept':'application/json'}
  });
  if(!response.ok)throw new Error(`HTTP_${response.status}`);
  return response.json();
}

export async function checkPlusApproval(){
  const identity=await getDeviceIdentity();
  const {deviceCode,legacyDeviceCode}=identity;
  try{
    const qs=new URLSearchParams({device_code:deviceCode});
    if(legacyDeviceCode&&legacyDeviceCode!==deviceCode)qs.set('legacy_device_code',legacyDeviceCode);
    const data=await fetchJson(`${PLUS_API_BASE}/api/plus/status?${qs.toString()}`);
    return {
      approved:Boolean(data?.approved),
      deviceCode,
      status:data?.status||'none',
      approvedAt:data?.approvedAt||null,
      expiresAt:data?.expiresAt||null
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
    const identity=await getDeviceIdentity();
    const qs=new URLSearchParams({device_code:entitlement.deviceCode});
    if(identity.legacyDeviceCode&&identity.legacyDeviceCode!==entitlement.deviceCode)qs.set('legacy_device_code',identity.legacyDeviceCode);
    const remote=await fetchJson(`${PLUS_API_BASE}/api/plus/payload?${qs.toString()}`);
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
  apiBase:PLUS_API_BASE,
  protectedFile:PLUS_FILE
};
