import type {Course,Lesson} from './course';
import saved from './data/youtube-catalog.json' with {type:'json'};
const HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be']);
export function isYoutube(value:string){try{return HOSTS.has(new URL(value).hostname)}catch{return false}}
export function playlistUrl(value:string):URL {
 let u:URL;try{u=new URL(value)}catch{throw new Error('Paste a link to a YouTube playlist.')}
 const id=u.searchParams.get('list');
 if(u.protocol!=='https:'||!HOSTS.has(u.hostname)||u.port||u.username||u.password||!id||!/^PL[\w-]{10,100}$/.test(id))throw new Error('A public YouTube playlist with a video list is required.');
 return new URL('https://www.youtube.com/playlist?list='+id);
}
type Obj=Record<string,any>;
function findAll(value:unknown,key:string):Obj[]{
 if(!value||typeof value!=='object')return [];
 const obj=value as Obj;
 return [...(obj[key]?[obj[key]]:[]),...Object.values(obj).flatMap(v=>findAll(v,key))];
}
function label(v:Obj|undefined):string{return v?.simpleText??v?.content??v?.runs?.map((r:Obj)=>r.text??'').join('')??''}
export function initialData(html:string):Obj {
 const match=/(?:var\s+)?ytInitialData\s*=\s*/.exec(html);
 if(!match)throw new Error('YouTube did not provide the video list. Check playlist access or paste links as a list.');
 const start=match.index+match[0].length;let depth=0,quoted=false,escaped=false;
 for(let i=start;i<html.length;i++){
  const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
  if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return JSON.parse(html.slice(start,i+1));
 }
 throw new Error('YouTube returned an incomplete list. Try again.');
}
function entries(data:Obj,source:URL){
 const id=source.searchParams.get('list');let skipped=0;
 const legacy=findAll(data,'playlistVideoRenderer').map(v=>({id:v.videoId,title:label(v.title),playable:v.isPlayable!==false}));
 const modern=findAll(data,'lockupViewModel').filter(v=>v.contentType==='LOCKUP_CONTENT_TYPE_VIDEO'&&findAll(v.rendererContext,'watchEndpoint').some(e=>e.playlistId===id)).map(v=>({id:v.contentId,title:label(v.metadata?.lockupMetadataViewModel?.title),playable:true}));
 const lessons:Lesson[]=[];
 for(const v of [...legacy,...modern]){
  if(!v.playable||!v.title||!/^[-\w]{11}$/.test(v.id??'')){skipped++;continue}
  const url=`https://www.youtube.com/watch?v=${v.id}&list=${id}`;
  lessons.push({id:url,url,title:v.title.slice(0,200),note:'',completedAt:null});
 }
 const continuation=findAll(data,'continuationCommand').find(c=>typeof c.token==='string')?.token;
 return {lessons,skipped,continuation};
}
export function parseYoutube(html:string,source:URL){
 const data=initialData(html);const content=data.contents??{};
 const header=findAll(data,'playlistHeaderRenderer')[0];
 const title=findAll(data,'playlistMetadataRenderer')[0]?.title??label(header?.title);
 const count=Number(label(header?.numVideosText).replace(/[^0-9]/g,''))||undefined;
 const page=entries(content,source);
 if(!title||!page.lessons.length)throw new Error('The playlist has no available videos. Make sure it is public.');
 return {course:{id:source.href,source:'YouTube',sourceUrl:source.href,title:String(title).slice(0,120),lessons:page.lessons} as Course,count,...page};
}
async function read(response:Response){
 if(!response.ok)throw new Error('YouTube did not provide the playlist. Try again later or paste links as a list.');
 const reader=response.body?.getReader();if(!reader)throw new Error('YouTube returned an empty response.');
 let bytes=0,text='';const decoder=new TextDecoder();
 while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>8_000_000){await reader.cancel();throw new Error('The playlist is too large. Paste links as a list.')};text+=decoder.decode(part.value,{stream:true})}
 return text+decoder.decode();
}
export async function fetchYoutube(value:string,fetcher:typeof fetch=fetch):Promise<Course>{
 const source=playlistUrl(value);const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
 try{
  const html=await read(await fetcher(source.href+'&hl=en',{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html','Accept-Language':'en'}}));
  const parsed=parseYoutube(html,source);let lessons=parsed.lessons,skipped=parsed.skipped,token=parsed.continuation;
  if((parsed.count??0)>2000)throw new Error('A collection can contain up to 2,000 videos. Split the playlist.');
  const version=/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"\\]+)"/.exec(html)?.[1];
  const seenTokens=new Set<string>();
  for(let page=0;token&&(!parsed.count||lessons.length+skipped<parsed.count);page++){
   if(page>=24||seenTokens.has(token)||!version)throw new Error('Couldn’t load the entire playlist. Paste links as a list.');
   seenTokens.add(token);
   const body=await read(await fetcher('https://www.youtube.com/youtubei/v1/browse',{method:'POST',redirect:'manual',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({context:{client:{clientName:'WEB',clientVersion:version,hl:'en'}},continuation:token})}));
   const json=JSON.parse(body);const items=findAll(json,'appendContinuationItemsAction').flatMap(p=>p.continuationItems??[]);
   const next=entries({items},source);lessons.push(...next.lessons);skipped+=next.skipped;token=next.continuation;
   if(lessons.length>2000)throw new Error('A collection can contain up to 2,000 videos. Split the playlist.');
  }
  if(parsed.count&&lessons.length+skipped<parsed.count)throw new Error('YouTube returned only part of the playlist. Try again later.');
  const unique=lessons.filter((l,i,a)=>a.findIndex(v=>v.id===l.id)===i);
  const notices=[];if(skipped)notices.push(`Unavailable videos: ${skipped}`);if(unique.length<lessons.length)notices.push('Duplicates skipped');
  return {...parsed.course,lessons:unique,importNotice:notices.join(' · ')||undefined};
 }catch(error){
  const known=saved.courses.find(c=>c.sourceUrl===source.href);
  if(known)return {...structuredClone(known),importNotice:'Backup catalogue · 13 Oct 2026'};
  if(error instanceof Error&&error.name==='AbortError')throw new Error('YouTube is taking too long to respond. Try again.');
  throw error;
 }finally{clearTimeout(timeout)}
}
