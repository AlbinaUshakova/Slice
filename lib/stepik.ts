import type {Course,Lesson} from './course';

const HOST='stepik.org';
type Json=Record<string,unknown>;

export function isStepik(value:string):boolean{try{return new URL(value).hostname.toLowerCase()===HOST}catch{return false}}

export function stepikCourseUrl(value:string):{url:URL;id:number}{
 let input:URL;try{input=new URL(value)}catch{throw new Error('Вставь ссылку на курс Stepik.')}
 const match=/^\/(?:course\/(?:[^/]*-)?|a\/)?(\d+)(?:\/|$)/.exec(input.pathname);
 if(input.protocol!=='https:'||input.hostname.toLowerCase()!==HOST||input.port||input.username||input.password||!match)
  throw new Error('Нужна открытая ссылка на курс Stepik, а не на отдельный урок.');
 const id=Number(match[1]);return {id,url:new URL(`https://${HOST}/course/${id}`)};
}

function apiUrl(path:string):URL{return new URL(`https://${HOST}/api/${path}`)}

async function readJson(url:URL,fetcher:typeof fetch,signal:AbortSignal):Promise<Json>{
 let current=url;
 for(let redirects=0;redirects<4;redirects++){
  const response=await fetcher(current,{redirect:'manual',signal,headers:{Accept:'application/json','User-Agent':'DayByDay/1.0 (public course organizer)'}});
  if(response.status>=300&&response.status<400){
   const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('Stepik вернул пустое перенаправление.');
   const target=new URL(location,current);if(target.protocol!=='https:'||target.hostname!==HOST||target.port||target.username||target.password)throw new Error('Stepik перенаправил запрос на неподдерживаемый адрес.');
   current=target;continue;
  }
  if(!response.ok)throw new Error('Stepik временно не отдал структуру курса. Попробуй позже.');
  if(!/application\/json/i.test(response.headers.get('content-type')??''))throw new Error('Stepik вернул страницу вместо структуры курса.');
  const raw=await response.text();if(raw.length>4_000_000)throw new Error('Структура курса Stepik слишком большая.');
  return JSON.parse(raw) as Json;
 }
 throw new Error('Слишком много перенаправлений Stepik.');
}

async function objects(kind:string,ids:number[],fetcher:typeof fetch,signal:AbortSignal):Promise<Json[]>{
 const result:Json[]=[];
 for(let start=0;start<ids.length;start+=50){
  const batch=ids.slice(start,start+50);let page=1;
  while(true){
   const url=apiUrl(kind);for(const id of batch)url.searchParams.append('ids[]',String(id));url.searchParams.set('page',String(page));
   const json=await readJson(url,fetcher,signal),items=json[kind];if(!Array.isArray(items))throw new Error('Stepik вернул неполную структуру курса.');
   result.push(...items.filter((item):item is Json=>!!item&&typeof item==='object'));
   const meta=json.meta as Json|undefined;if(meta?.has_next!==true)break;if(++page>20)throw new Error('В структуре Stepik слишком много страниц.');
  }
 }
 return result;
}

function numbers(value:unknown):number[]{return Array.isArray(value)?value.filter((item):item is number=>Number.isInteger(item)&&item>0):[]}
function number(value:unknown):number|undefined{return typeof value==='number'&&Number.isInteger(value)&&value>0?value:undefined}

export async function fetchStepik(value:string,fetcher:typeof fetch=fetch):Promise<Course>{
 const source=stepikCourseUrl(value);const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const root=await readJson(apiUrl(`courses/${source.id}`),fetcher,controller.signal),course=Array.isArray(root.courses)?root.courses[0] as Json|undefined:undefined;
  if(!course||typeof course.title!=='string')throw new Error('Курс Stepik не найден или закрыт.');
  const sectionIds=numbers(course.sections);if(!sectionIds.length)throw new Error('В курсе Stepik пока нет открытых разделов.');
  const sections=await objects('sections',sectionIds,fetcher,controller.signal),sectionById=new Map(sections.map(item=>[number(item.id),item]));
  const orderedSections=sectionIds.map(id=>sectionById.get(id)).filter((item):item is Json=>!!item);
  if(orderedSections.length!==sectionIds.length)throw new Error('Stepik вернул не все разделы курса.');
  const unitIds=orderedSections.flatMap(section=>numbers(section.units));if(!unitIds.length)throw new Error('В курсе Stepik пока нет открытых уроков.');
  if(unitIds.length>2000)throw new Error('В одной подборке — до 2000 уроков. Раздели курс.');
  const units=await objects('units',unitIds,fetcher,controller.signal),unitById=new Map(units.map(item=>[number(item.id),item]));
  const lessonIds=[...new Set(unitIds.map(id=>number(unitById.get(id)?.lesson)).filter((id):id is number=>!!id))];
  const lessonsData=await objects('lessons',lessonIds,fetcher,controller.signal),lessonById=new Map(lessonsData.map(item=>[number(item.id),item]));
  const lessons:Lesson[]=[];
  for(const section of orderedSections){
   const group=typeof section.title==='string'?section.title.slice(0,120):'Раздел';
   for(const unitId of numbers(section.units)){
    const lessonId=number(unitById.get(unitId)?.lesson),lesson=lessonId?lessonById.get(lessonId):undefined,title=lesson?.title;
    if(!lessonId||typeof title!=='string'||!title.trim())continue;
    const url=`https://${HOST}/lesson/${lessonId}/step/1`;
    lessons.push({id:`${source.url.href}#unit=${unitId}`,url,title:title.trim().slice(0,200),completedAt:null,note:'',group});
   }
  }
  if(lessons.length!==unitIds.length)throw new Error(`Stepik вернул только часть курса: ${lessons.length} из ${unitIds.length} уроков.`);
  return {id:source.url.href,title:course.title.slice(0,120),source:'Stepik',sourceUrl:source.url.href,lessons,
   importNotice:`Полная структура подтверждена API Stepik: ${lessons.length} уроков · ${orderedSections.length} разделов. Закрытые материалы могут потребовать входа на Stepik.`};
 }catch(error){
  if(error instanceof Error&&error.name==='AbortError')throw new Error('Stepik отвечает слишком долго. Попробуй позже.');
  throw error;
 }finally{clearTimeout(timeout)}
}
