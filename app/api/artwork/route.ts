import {publicUrl} from '@/lib/public-page';

const SPOTIFY='open.spotify.com';

export async function GET(request:Request){
 try{
  const raw=new URL(request.url).searchParams.get('url')??'';
  const source=publicUrl(raw);
  if(source.protocol!=='https:'||source.hostname!==SPOTIFY||!/^\/(?:show|episode)\/[A-Za-z0-9]{22}$/.test(source.pathname))return new Response(null,{status:404});
  const endpoint=new URL(`https://${SPOTIFY}/oembed`);endpoint.searchParams.set('url',source.href);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch(endpoint,{signal:controller.signal,redirect:'error',headers:{Accept:'application/json'}});
   if(!response.ok)return new Response(null,{status:404});
   const data=await response.json() as {thumbnail_url?:unknown};
   if(typeof data.thumbnail_url!=='string')return new Response(null,{status:404});
   const image=new URL(data.thumbnail_url);
   if(image.protocol!=='https:'||!(image.hostname==='i.scdn.co'||/(?:^|\.)spotifycdn\.com$/.test(image.hostname))||image.port||image.username||image.password)return new Response(null,{status:404});
   return new Response(null,{status:307,headers:{Location:image.href,'Cache-Control':'public, max-age=86400, stale-while-revalidate=604800'}});
  }finally{clearTimeout(timeout)}
 }catch{return new Response(null,{status:404})}
}
