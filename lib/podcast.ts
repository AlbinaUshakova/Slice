import type {Course,Lesson} from './course';

const SPOTIFY_HOST='open.spotify.com';
const SPOTIFY_FEEDS:Record<string,string>={
 '4HQAd7Pw4J1I3gPBCANURe':'https://cloud.mave.digital/50251',
};
const MAX_FEED_BYTES=4_000_000;

export function isSpotify(value:string):boolean {
 try{return new URL(value).hostname.toLowerCase()===SPOTIFY_HOST}catch{return false}
}

export function spotifyShowUrl(value:string):URL {
 let url:URL;try{url=new URL(value)}catch{throw new Error('Вставь ссылку на подкаст Spotify.')}
 const match=/^\/show\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
 if(url.protocol!=='https:'||url.hostname.toLowerCase()!==SPOTIFY_HOST||url.port||url.username||url.password||!match)
  throw new Error('Нужна открытая ссылка на подкаст Spotify.');
 return new URL(`https://${SPOTIFY_HOST}/show/${match[1]}`);
}

function decodeXml(value:string):string {
 return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'')
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,n:string)=>{const cp=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):''})
  .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi,(_,n:string)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[n.toLowerCase() as 'amp'|'quot'|'apos'|'lt'|'gt'|'nbsp']))
  .replace(/\s+/g,' ').trim();
}

function tag(xml:string,name:string):string {
 return decodeXml(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i').exec(xml)?.[1]??'');
}

export function parsePodcastFeed(xml:string,source:URL):Course {
 const channel=xml.slice(0,xml.search(/<item\b/i)>=0?xml.search(/<item\b/i):xml.length);
 const title=tag(channel,'title');
 const lessons:Lesson[]=[];const seen=new Set<string>();
 for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  const item=match[1];const lessonTitle=tag(item,'title');
  const rawLink=tag(item,'link')||decodeXml(/<enclosure\b[^>]*\burl\s*=\s*["']([^"']+)["']/i.exec(item)?.[1]??'');
  let link:URL;try{link=new URL(rawLink)}catch{continue}
  if(!/^https?:$/.test(link.protocol)||link.username||link.password||!lessonTitle)continue;
  link.hash='';const url=link.href;if(seen.has(url))continue;seen.add(url);
  lessons.push({id:url,url,title:lessonTitle.slice(0,200),completedAt:null,note:''});
  if(lessons.length>=2000)break;
 }
 if(!title||!lessons.length)throw new Error('В RSS-ленте не найдены выпуски подкаста.');
 return {
  id:source.href,title:title.slice(0,120),source:'Spotify · RSS',sourceUrl:source.href,lessons,
  importNotice:`Загружено из официальной открытой RSS-ленты: ${lessons.length} выпусков. Ссылки открывают страницы выпусков автора.`,
 };
}

function knownFeed(source:URL):URL {
 const id=source.pathname.split('/').at(-1)??'';const value=SPOTIFY_FEEDS[id];
 if(!value)throw new Error('Spotify показывает только часть выпусков. Для этого подкаста пока не найдена официальная открытая RSS-лента.');
 return new URL(value);
}

function validFeedRedirect(value:string,base:URL):URL {
 const url=new URL(value,base);
 if(url.protocol!=='https:'||url.hostname!==base.hostname||url.port||url.username||url.password)
  throw new Error('RSS-лента перенаправила запрос на неподдерживаемый адрес.');
 return url;
}

async function readFeed(response:Response):Promise<string> {
 if(!response.ok)throw new Error('Не удалось открыть RSS-ленту подкаста. Попробуй позже.');
 if(!/\b(?:application|text)\/(?:rss\+xml|xml)\b/i.test(response.headers.get('content-type')??''))
  throw new Error('Источник вернул не RSS-ленту.');
 const reader=response.body?.getReader();if(!reader)throw new Error('RSS-лента оказалась пустой.');
 const decoder=new TextDecoder();let xml='',bytes=0;
 while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;
  if(bytes>MAX_FEED_BYTES){await reader.cancel();throw new Error('RSS-лента слишком большая.');}
  xml+=decoder.decode(part.value,{stream:true});
 }
 return xml+decoder.decode();
}

export async function fetchSpotify(value:string,fetcher:typeof fetch=fetch):Promise<Course> {
 const source=spotifyShowUrl(value);let feed=knownFeed(source);
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  for(let redirects=0;redirects<4;redirects++){
   const response=await fetcher(feed,{redirect:'manual',signal:controller.signal,headers:{Accept:'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8','User-Agent':'DayByDay/1.0 (podcast course organizer)'}});
   if(response.status>=300&&response.status<400){
    const location=response.headers.get('location');await response.body?.cancel();
    if(!location)throw new Error('RSS-лента вернула пустое перенаправление.');
    feed=validFeedRedirect(location,feed);continue;
   }
   return parsePodcastFeed(await readFeed(response),source);
  }
  throw new Error('Слишком много перенаправлений RSS-ленты.');
 }catch(error){
  if(error instanceof Error&&error.name==='AbortError')throw new Error('RSS-лента отвечает слишком долго. Попробуй ещё раз.');
  throw error;
 }finally{clearTimeout(timeout)}
}
