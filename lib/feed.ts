import type {Course,Lesson} from './course';
import {assertPublicDns,publicUrl} from './public-page.ts';

const MAX_FEED_BYTES=4_000_000;

export function isFeedUrl(value:string):boolean {
 try{
  const url=publicUrl(value),path=url.pathname.toLowerCase();
  return /(?:\.rss|\.xml|\.atom)$/.test(path)||/(?:^|\/)(?:feed|rss|atom)(?:\/|$)/.test(path)||
   /^(?:feeds?|rss)\./.test(url.hostname)||url.hostname==='cloud.mave.digital'||/(?:rss|atom)/i.test(url.searchParams.get('feed')??'');
 }catch{return false}
}

export function decodeXml(value:string):string {
 return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'')
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,n:string)=>{const cp=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):''})
  .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi,(_,n:string)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[n.toLowerCase() as 'amp'|'quot'|'apos'|'lt'|'gt'|'nbsp']))
  .replace(/\s+/g,' ').trim();
}

function tag(xml:string,name:string):string {
 return decodeXml(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i').exec(xml)?.[1]??'');
}

function entryLink(xml:string,source:URL,atom:boolean):URL|null {
 let raw=tag(xml,'link');
 if(atom){
  const links=[...xml.matchAll(/<link\b([^>]*)\/?\s*>/gi)].map(match=>match[1]);
  const attrs=links.find(value=>!(/\brel\s*=\s*["'](?!alternate["'])/i.test(value)))??links[0]??'';
  raw=decodeXml(/\bhref\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]??raw);
 }
 if(!raw)raw=decodeXml(/<enclosure\b[^>]*\burl\s*=\s*["']([^"']+)["']/i.exec(xml)?.[1]??'');
 let url:URL;try{url=publicUrl(new URL(raw,source).href)}catch{return null}
 url.hash='';return url;
}

export function parseFeed(xml:string,source:URL,options:{sourceName?:string;notice?:string}={}):Course {
 const atom=/<feed\b/i.test(xml)&&/<entry\b/i.test(xml);const itemName=atom?'entry':'item';
 const first=new RegExp(`<${itemName}\\b`,'i').exec(xml)?.index??xml.length;
 const title=tag(xml.slice(0,first),'title');const lessons:Lesson[]=[];const seen=new Set<string>();
 const pattern=new RegExp(`<${itemName}\\b[^>]*>([\\s\\S]*?)<\\/${itemName}>`,'gi');
 for(const match of xml.matchAll(pattern)){
  const item=match[1],lessonTitle=tag(item,'title'),link=entryLink(item,source,atom);
  if(!lessonTitle||!link||seen.has(link.href))continue;seen.add(link.href);
  lessons.push({id:link.href,url:link.href,title:lessonTitle.slice(0,200),completedAt:null,note:''});
  if(lessons.length>=2000)break;
 }
 if(!title||!lessons.length)throw new Error('No items were found in the RSS/Atom feed.');
 const notice=options.notice??`Loaded from a public RSS/Atom feed: ${lessons.length} items. These are all the entries currently provided by the feed; older posts may have been removed by the publisher.`;
 return {id:source.href,title:title.slice(0,120),source:options.sourceName??'RSS / Atom',sourceUrl:source.href,lessons,importNotice:notice};
}

async function readFeed(value:string,fetcher:typeof fetch):Promise<{xml:string;url:URL}> {
 let url=publicUrl(value);url.hash='';const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{
  for(let redirects=0;redirects<4;redirects++){
   await assertPublicDns(url,fetcher,controller.signal);
   const response=await fetcher(url,{redirect:'manual',signal:controller.signal,headers:{Accept:'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8','User-Agent':'DayByDay/1.0 (public feed organizer)'}});
   if(response.status>=300&&response.status<400){
    const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('The RSS feed returned an empty redirect.');
    url=publicUrl(new URL(location,url).href);url.hash='';continue;
   }
   if(!response.ok)throw new Error('Couldn’t open the RSS/Atom feed.');
   const reader=response.body?.getReader();if(!reader)throw new Error('The RSS/Atom feed is empty.');
   const decoder=new TextDecoder();let xml='',bytes=0;
   while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;
    if(bytes>MAX_FEED_BYTES){await reader.cancel();throw new Error('The RSS/Atom feed is too large.');}
    xml+=decoder.decode(part.value,{stream:true});
   }
   xml+=decoder.decode();
   if(!/<(?:rss|feed)\b/i.test(xml.slice(0,4000)))throw new Error('The source did not return an RSS/Atom feed.');
   return {xml,url};
  }
  throw new Error('Too many RSS/Atom feed redirects.');
 }catch(error){
  if(error instanceof Error&&error.name==='AbortError')throw new Error('The RSS/Atom feed is taking too long to respond.');
  throw error;
 }finally{clearTimeout(timer)}
}

export async function fetchFeed(value:string,fetcher:typeof fetch=fetch):Promise<Course>{
 const result=await readFeed(value,fetcher);return parseFeed(result.xml,result.url);
}
