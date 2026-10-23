import type { Course, Lesson } from './course';
import {isYoutube,fetchYoutube} from './youtube.ts';
import {isVergavi,fetchVergavi} from './vergavi.ts';
import {fetchWebCourse,singlePage} from './web-import.ts';
import {publicUrl} from './public-page.ts';
import catalog from './data/speaking-catalog.json' with { type: 'json' };
export function courseUrl(value: string): URL {
  let u: URL;
  try { u = new URL(value); } catch { throw new Error('Вставь полную ссылку на страницу подборки.'); }
  if (u.protocol !== 'https:' || u.hostname !== 'learnenglish.britishcouncil.org' || u.port || u.username || u.password) throw new Error('Нужна публичная ссылка British Council без пароля и нестандартного порта.');
  if (!/^\/(free-resources|skills)\/[a-z0-9/-]+\/?$/.test(u.pathname)) throw new Error('Нужна страница раздела с материалами British Council.');
  u.hash = ''; u.search = ''; u.pathname = u.pathname.replace(/\/$/,''); return u;
}
function text(value: string): string {
 return value.replace(/<[^>]*>/g,'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const cp=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10); return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):'';}).replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[n as 'amp'|'quot'|'apos'|'lt'|'gt'|'nbsp'] ?? '')).replace(/\s+/g,' ').trim();
}
export function parseCourse(html: string, source: URL): Course {
 const lessons: Lesson[] = []; const seen = new Set<string>();
 for (const heading of html.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)) {
  const a = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(heading[1]);
  if (!a) continue;
  let u: URL; try { u=new URL(a[1],source); } catch { continue; }
  u.hash=''; u.search=''; u.pathname=u.pathname.replace(/\/$/,'');
  const prefix=source.pathname+'/'; const tail=u.pathname.slice(prefix.length);
  if (u.origin!==source.origin || !u.pathname.startsWith(prefix) || !tail || tail.includes('/')) continue;
  const title=text(a[2]); if (!title || seen.has(u.href)) continue;
  seen.add(u.href); lessons.push({id:u.href,url:u.href,title:title.slice(0,200),completedAt:null,note:''});
  if (lessons.length >= 200) break;
 }
 if (!lessons.length) throw new Error('Не удалось найти материалы. Проверь, что это страница со списком материалов, или вставь ссылки списком.');
 const title=text(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? 'English course');
 return {id:source.href,title:title.slice(0,120),source:'British Council',sourceUrl:source.href,lessons};
}
type ImportOptions = { fetcher?: typeof fetch };
const LEVEL_PATH = /\/(?:free-resources|skills)\/(?:speaking|reading|listening|writing)\/(?:a1|a2|b1|b2|c1|c2)(?:-[a-z0-9-]+)?$/;
const SPEAKING_ROOT = 'https://learnenglish.britishcouncil.org/free-resources/speaking';
function catalogCopy(url: URL): Course | null {
 const canonical=url.href.replace('/skills/','/free-resources/');
 const item=catalog.courses.find(c=>c.sourceUrl===canonical);
 const notice='Резервный каталог · 13.10.2026';
 if(item) return {...structuredClone(item),importNotice:notice};
 if(canonical===SPEAKING_ROOT) return {
  id:SPEAKING_ROOT,title:'Speaking',source:'British Council',sourceUrl:SPEAKING_ROOT,importNotice:notice,
  lessons:catalog.courses.map(c=>({id:c.id,title:c.title,url:c.sourceUrl,completedAt:null,note:''}))
 };
 return null;
}
async function fetchIndex(value: string, fetcher: typeof fetch): Promise<Course> {
 let url=courseUrl(value);
 const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),8000);
 try {
  let response: Response | undefined;
  for (let i=0;i<4;i++) {
   response=await fetcher(url,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html','User-Agent':'DayByDay/1.0 (course link organizer)'}});
   if (response.status>=300 && response.status<400) {
    const target=response.headers.get('location');
    if(!target)throw new Error('Не удалось открыть ссылку.');
    url=courseUrl(new URL(target,url).href); continue;
   }
   break;
  }
  if (!response?.ok) throw new Error('Сайт не отдал страницу. Попробуй позже или вставь ссылки списком.');
  if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('По этой ссылке нет страницы с материалами.');
  const reader=response.body?.getReader(); if(!reader) throw new Error('Страница оказалась пустой.');
  const decoder=new TextDecoder(); let html=''; let bytes=0;
  while(true) {
   const {done,value}=await reader.read(); if(done)break; bytes+=value.length;
   if(bytes>2_000_000){await reader.cancel();throw new Error('Страница слишком большая. Вставь ссылки списком.');}
   html+=decoder.decode(value,{stream:true});
  }
  html+=decoder.decode(); return parseCourse(html,url);
 } catch(error) {
  // Known public course link snapshots keep import usable if the source rejects server requests.
  const saved=catalogCopy(url);
  if(saved)return saved;
  if(error instanceof Error && error.name==='AbortError')throw new Error('Сайт отвечает слишком долго. Попробуй позже.');
  throw error;
 } finally { clearTimeout(timeout); }
}
export async function fetchCourse(value: string, options: ImportOptions = {}): Promise<Course> {
 const fetcher=options.fetcher ?? fetch;
 if(isYoutube(value)){
  const url=publicUrl(value);
  return url.searchParams.has('list')?fetchYoutube(value,fetcher):singlePage(url,'YouTube','Одна ссылка — один день. Название можно изменить.');
 }
 if(isVergavi(value))return fetchVergavi(value,fetcher);
 let host:string;try{host=new URL(value).hostname}catch{return fetchWebCourse(value,fetcher)}
 if(host!=='learnenglish.britishcouncil.org')return fetchWebCourse(value,fetcher);
 const root=await fetchIndex(value,fetcher);
 if(!root.lessons.length || !root.lessons.every(l=>LEVEL_PATH.test(new URL(l.url).pathname)))return root;
 if(root.lessons.length>8)throw new Error('Выбери отдельный раздел или уровень.');
 const sections=await Promise.all(root.lessons.map(l=>fetchIndex(l.url,fetcher)));
 const seen=new Set<string>();
 const lessons=sections.flatMap(c=>c.lessons.map(l=>({...l,group:c.title.split(' ')[0].toUpperCase()}))).filter(l=>{
  if(seen.has(l.url))return false;seen.add(l.url);return true;
 });
 if(!lessons.length || lessons.length>200)throw new Error('Выбери отдельный уровень.');
 return {...root,lessons,importNotice:root.importNotice??sections.find(c=>c.importNotice)?.importNotice};
}
