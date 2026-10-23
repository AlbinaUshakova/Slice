import type {Course,Lesson} from './course';
import saved from './data/youtube-catalog.json' with {type:'json'};
const HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be']);
export function isYoutube(value:string){try{return HOSTS.has(new URL(value).hostname)}catch{return false}}
export function playlistUrl(value:string):URL {
 let u:URL;try{u=new URL(value)}catch{throw new Error('Вставь ссылку на плейлист YouTube.')}
 const id=u.searchParams.get('list');
 if(u.protocol!=='https:'||!HOSTS.has(u.hostname)||u.port||u.username||u.password||!id||!/^PL[\w-]{10,100}$/.test(id))throw new Error('Нужен открытый плейлист YouTube со списком видео.');
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
 if(!match)throw new Error('YouTube не отдал список видео. Проверь доступ к плейлисту или вставь ссылки списком.');
 const start=match.index+match[0].length;let depth=0,quoted=false,escaped=false;
 for(let i=start;i<html.length;i++){
  const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
  if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return JSON.parse(html.slice(start,i+1));
 }
 throw new Error('YouTube вернул неполный список. Попробуй ещё раз.');
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
 if(!title||!page.lessons.length)throw new Error('В плейлисте нет доступных видео. Проверь, что он открыт.');
 return {course:{id:source.href,source:'YouTube',sourceUrl:source.href,title:String(title).slice(0,120),lessons:page.lessons} as Course,count,...page};
}
async function read(response:Response){
 if(!response.ok)throw new Error('YouTube не отдал плейлист. Попробуй позже или вставь ссылки списком.');
 const reader=response.body?.getReader();if(!reader)throw new Error('Пустой ответ YouTube.');
 let bytes=0,text='';const decoder=new TextDecoder();
 while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>8_000_000){await reader.cancel();throw new Error('Плейлист слишком большой. Вставь ссылки списком.')};text+=decoder.decode(part.value,{stream:true})}
 return text+decoder.decode();
}
export async function fetchYoutube(value:string,fetcher:typeof fetch=fetch):Promise<Course>{
 const source=playlistUrl(value);const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
 try{
  const html=await read(await fetcher(source.href+'&hl=ru',{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html','Accept-Language':'ru'}}));
  const parsed=parseYoutube(html,source);let lessons=parsed.lessons,skipped=parsed.skipped,token=parsed.continuation;
  if((parsed.count??0)>2000)throw new Error('В одной подборке — до 2000 видео. Раздели плейлист.');
  const version=/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"\\]+)"/.exec(html)?.[1];
  const seenTokens=new Set<string>();
  for(let page=0;token&&(!parsed.count||lessons.length+skipped<parsed.count);page++){
   if(page>=24||seenTokens.has(token)||!version)throw new Error('Не удалось получить весь плейлист. Вставь ссылки списком.');
   seenTokens.add(token);
   const body=await read(await fetcher('https://www.youtube.com/youtubei/v1/browse',{method:'POST',redirect:'manual',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({context:{client:{clientName:'WEB',clientVersion:version,hl:'ru'}},continuation:token})}));
   const json=JSON.parse(body);const items=findAll(json,'appendContinuationItemsAction').flatMap(p=>p.continuationItems??[]);
   const next=entries({items},source);lessons.push(...next.lessons);skipped+=next.skipped;token=next.continuation;
   if(lessons.length>2000)throw new Error('В одной подборке — до 2000 видео. Раздели плейлист.');
  }
  if(parsed.count&&lessons.length+skipped<parsed.count)throw new Error('YouTube вернул только часть плейлиста. Попробуй позже.');
  const unique=lessons.filter((l,i,a)=>a.findIndex(v=>v.id===l.id)===i);
  const notices=[];if(skipped)notices.push(`Недоступных видео: ${skipped}`);if(unique.length<lessons.length)notices.push('Повторы пропущены');
  return {...parsed.course,lessons:unique,importNotice:notices.join(' · ')||undefined};
 }catch(error){
  const known=saved.courses.find(c=>c.sourceUrl===source.href);
  if(known)return {...structuredClone(known),importNotice:'Резервный каталог · 13.10.2026'};
  if(error instanceof Error&&error.name==='AbortError')throw new Error('YouTube отвечает слишком долго. Попробуй ещё раз.');
  throw error;
 }finally{clearTimeout(timeout)}
}
