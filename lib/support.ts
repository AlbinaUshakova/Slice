export function donationUrl(value:string|undefined):string|null{
 if(!value?.trim())return null;
 try{const u=new URL(value.trim());if(u.protocol!=='https:'||u.username||u.password)return null;return u.href}catch{return null}
}
