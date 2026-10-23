/** Only public HTTP pages may be fetched. No user cookies or credentials are forwarded. */
export class UnsafePage extends Error {}
export function publicUrl(value:string):URL {
 let url:URL;try{url=new URL(value)}catch{throw new UnsafePage('Paste a full link: https://…');}
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(!/^https?:$/.test(url.protocol)||url.username||url.password||url.port||value.length>2000||
  !host.includes('.')||/^[\d.]+$/.test(host)||host.includes(':')||
  /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(host)||
  /(?:^|\.)(?:metadata\.google\.internal|localhost\.localdomain)$/.test(host))
  throw new UnsafePage('A public link without a password or custom port is required.');
 url.hostname=host;return url;
}
export function isPublicAddress(value:string):boolean {
 if(/^\d+\.\d+\.\d+\.\d+$/.test(value)){
  const [a,b,c,d]=value.split('.').map(Number);
  return [a,b,c,d].every(n=>n>=0&&n<=255)&&a>0&&a<224&&a!==10&&a!==127&&
   !(a===100&&b>=64&&b<=127)&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&
   !(a===192&&(b===0||b===168||(b===88&&c===99)))&&
   !(a===198&&(b===18||b===19||(b===51&&c===100)))&&!(a===203&&b===0&&c===113);
 }
 // Global IPv6 unicast only. Exclude protocol assignments/documentation and transition ranges.
 try{
  const ip=new URL(`http://[${value}]/`).hostname.slice(1,-1).toLowerCase();
  return /^[23][\da-f]{3}:/.test(ip)&&!/^200[12]:/.test(ip)&&!/^3fff:/.test(ip);
 }catch{return false}
}
export async function assertPublicDns(url:URL,fetcher:typeof fetch,signal:AbortSignal){
 const responses=await Promise.all(['A','AAAA'].map(async type=>{
  const dns=new URL('https://cloudflare-dns.com/dns-query');dns.searchParams.set('name',url.hostname);dns.searchParams.set('type',type);
  const response=await fetcher(dns,{signal,redirect:'manual',headers:{Accept:'application/dns-json'}});
  if(!response.ok)throw new Error('DNS HTTP '+response.status);
  return await response.json() as {Status?:number;Answer?:{type:number;data:string}[]};
 }));
 if(responses.some(r=>r.Status!==0))throw new Error('DNS unavailable');
 const addresses=responses.flatMap(r=>(r.Answer??[]).filter(a=>a.type===1||a.type===28));
 if(!addresses.length)throw new Error('DNS unavailable');
 if(addresses.some(a=>!isPublicAddress(a.data)))throw new UnsafePage('This address is unavailable for public import.');
}
export async function readPublicPage(value:string,fetcher:typeof fetch=fetch):Promise<{html:string;url:URL}> {
 let url=publicUrl(value);url.hash='';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let stage='dns';
 try{
  for(let i=0;i<4;i++){
   stage='dns';await assertPublicDns(url,fetcher,controller.signal);stage='page';
   const response=await fetcher(url,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html,application/xhtml+xml','User-Agent':'DayByDay/1.0 (public link organizer)'}});
   if(response.status>=300&&response.status<400){
    const target=response.headers.get('location');await response.body?.cancel();
    if(!target)throw new Error('Redirect unavailable');
    url=publicUrl(new URL(target,url).href);url.hash='';continue;
   }
   if(!response.ok) {await response.body?.cancel();throw new Error('Page HTTP '+response.status);}
   if(!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type')??'')){await response.body?.cancel();throw new Error('Not HTML');}
   stage='body';const reader=response.body?.getReader();if(!reader)throw new Error('Empty page');
   const decoder=new TextDecoder();let html='',bytes=0;
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;
    if(bytes>2_000_000){await reader.cancel();throw new Error('Page too large');}
    html+=decoder.decode(value,{stream:true});
   }
   return {html:html+decoder.decode(),url};
  }
  throw new Error('Too many redirects');
 }catch(error){
  // Operational diagnostics omit URLs, response bodies and user-provided data.
  const message=error instanceof Error?error.message:'';
  console.warn('Public page read failed',{stage,reason:/^(?:DNS HTTP |Page HTTP )\d{3}$|^(?:DNS unavailable|Not HTML|Empty page|Page too large|Too many redirects)$/.test(message)?message:error instanceof Error?error.name:'network'});
  throw error;
 }finally{clearTimeout(timer)}
}
