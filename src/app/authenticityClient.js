import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const INSTALLATION_KEY='alofok_auth_installation_v1';
const AUTH_API_BASE=(process.env.EXPO_PUBLIC_AUTH_API_URL||'').replace(/\/$/,'');
const AUTH_VERIFY_WEB=(process.env.EXPO_PUBLIC_AUTH_VERIFY_URL||'').replace(/\/$/,'');

function freshToken(){
  return `UFQ-${Date.now().toString(36).toUpperCase()}-${Crypto.randomUUID().replace(/-/g,'').slice(0,20).toUpperCase()}`;
}

export async function getAuthenticityInstallationId(){
  let current=await AsyncStorage.getItem(INSTALLATION_KEY);
  if(current)return current;
  current=`UFQ-${Crypto.randomUUID().replace(/-/g,'').slice(0,24).toUpperCase()}`;
  await AsyncStorage.setItem(INSTALLATION_KEY,current);
  return current;
}

export function authenticityConfig(){
  return {
    apiBase:AUTH_API_BASE,
    verifyWeb:AUTH_VERIFY_WEB,
    configured:Boolean(AUTH_API_BASE)
  };
}

export async function requestAuthenticityChallenge({edition,version}){
  const installationId=await getAuthenticityInstallationId();
  const issuedAt=new Date();
  const localToken=freshToken();
  const localExpiresAt=new Date(issuedAt.getTime()+2*60*1000).toISOString();

  if(!AUTH_API_BASE){
    return {
      configured:false,
      token:localToken,
      verifyUrl:'',
      expiresAt:localExpiresAt,
      issuedAt:issuedAt.toISOString(),
      installationId,
      edition,
      version
    };
  }

  const response=await fetch(`${AUTH_API_BASE}/v1/authenticity/challenge`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({app:'al ufuq',edition,version,installationId,nonce:localToken})
  });
  if(!response.ok)throw new Error(`AUTH_HTTP_${response.status}`);
  const data=await response.json();
  const token=String(data.token||'').trim();
  if(!token)throw new Error('AUTH_TOKEN_MISSING');
  const verifyUrl=String(data.verifyUrl||'').trim()||(
    AUTH_VERIFY_WEB?`${AUTH_VERIFY_WEB}?code=${encodeURIComponent(token)}`:''
  );
  return {
    configured:true,
    token,
    verifyUrl,
    expiresAt:data.expiresAt||localExpiresAt,
    issuedAt:data.issuedAt||issuedAt.toISOString(),
    installationId,
    edition,
    version
  };
}
