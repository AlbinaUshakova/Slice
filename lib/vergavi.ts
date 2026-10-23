import type {Course,Lesson} from './course.ts';

export function isVergavi(value:string):boolean {
 try{return new URL(value).hostname==='vergavi.ge'}catch{return false}
}
export function vergaviUrl(value:string):URL {
 const url=new URL(value);
 if(url.protocol!=='https:'||url.hostname!=='vergavi.ge'||url.port||url.username||url.password)throw new Error('An HTTPS link to vergavi.ge is required.');
 const path=url.pathname.replace(/\/$/,'');
 if(!/^\/(?:learn|program(?:\/(?:a1|a2|b1|b2|c1|c2))?)$/.test(path))throw new Error('Add vergavi.ge/learn or a /program page.');
 url.pathname=path==='/learn'?'/program':path;url.search='';url.hash='';return url;
}
function plain(value:string):string {
 return value.replace(/<[^>]*>/g,'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const cp=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):''}).replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[n as 'amp']??'')).replace(/\s+/g,' ').trim();
}
export function parseVergavi(html:string,source:URL):Course {
 const lessons:Lesson[]=[],seen=new Set<string>();
 const level=source.pathname.split('/')[2];
 for(const heading of html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)){
  const link=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(heading[1]);
  if(!link)continue;
  let url:URL;try{url=new URL(link[1],source)}catch{continue}
  const match=/^\/program\/(a1|a2|b1|b2|c1|c2)\/[a-z0-9-]+\/?$/.exec(url.pathname);
  if(url.origin!=='https://vergavi.ge'||url.username||url.password||!match||(level&&match[1]!==level))continue;
  url.hash='';url.search='';url.pathname=url.pathname.replace(/\/$/,'');
  const title=plain(link[2]).slice(0,200);if(!title||seen.has(url.href))continue;
  seen.add(url.href);lessons.push({id:url.href,url:url.href,title,group:match[1].toUpperCase(),completedAt:null,note:''});
  if(lessons.length>200)throw new Error('The programme is too large. Choose an individual Vergavi level.');
 }
 if(!lessons.length)throw new Error('No units were found in the public Vergavi programme. The /learn section requires signing in on the source site.');
 return {id:source.href,source:'Vergavi · Georgian',sourceUrl:source.href,title:level?`Georgian · ${level.toUpperCase()}`:'Georgian · Vergavi',lessons,importNotice:'Plan from the public programme: one unit per day. Exercises inside units are available after signing in to Vergavi.'};
}
export async function fetchVergavi(value:string,fetcher:typeof fetch=fetch):Promise<Course>{
 const source=vergaviUrl(value);
 // The level pages use separate card markup. Read the shared public outline
 // and filter it by the requested level so both URLs retain the same unit IDs.
 let url=new URL('/program',source);const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  let response:Response|undefined;
  for(let i=0;i<4;i++){
   response=await fetcher(url,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html','User-Agent':'DayByDay/1.0 (public course outline reader)'}});
   if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)throw new Error('Vergavi did not provide the programme.');const target=new URL(location,url);if(target.pathname==='/login')throw new Error('Vergavi requires signing in. Paste links to the items you need as a list.');url=vergaviUrl(target.href);continue;}
   break;
  }
  if(!response?.ok)throw new Error('Couldn’t open the public Vergavi programme. Try again later or paste links as a list.');
  if(!response.headers.get('content-type')?.includes('text/html'))throw new Error('Vergavi returned an unsupported page format.');
  const reader=response.body?.getReader();if(!reader)throw new Error('The Vergavi programme is empty.');
  const decoder=new TextDecoder();let html='',bytes=0;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2_000_000){await reader.cancel();throw new Error('The Vergavi programme is too large. Choose one level.')}html+=decoder.decode(value,{stream:true});}
  return parseVergavi(html+decoder.decode(),source);
 }finally{clearTimeout(timeout)}
}
