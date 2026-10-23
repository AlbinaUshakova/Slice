import type { Course, Lesson } from './course';
import {isYoutube,fetchYoutube} from './youtube.ts';
import {isVergavi,fetchVergavi} from './vergavi.ts';
import {isSpotify,fetchSpotify} from './podcast.ts';
import {isStepik,fetchStepik} from './stepik.ts';
import {isFeedUrl,fetchFeed} from './feed.ts';
import {fetchWebCourse,singlePage} from './web-import.ts';
import {publicUrl} from './public-page.ts';
import catalog from './data/speaking-catalog.json' with { type: 'json' };
export function courseUrl(value: string): URL {
  let u: URL;
  try { u = new URL(value); } catch { throw new Error('Paste the full link to the collection page.'); }
  if (u.protocol !== 'https:' || u.hostname !== 'learnenglish.britishcouncil.org' || u.port || u.username || u.password) throw new Error('A public British Council link without a password or custom port is required.');
  if (!/^\/(free-resources|skills)\/[a-z0-9/-]+\/?$/.test(u.pathname)) throw new Error('A British Council section page containing learning materials is required.');
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
 if (!lessons.length) throw new Error('Couldn’t find any items. Make sure this is a page with a list of materials, or paste links as a list.');
 const title=text(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? 'English course');
 return {id:source.href,title:title.slice(0,120),source:'British Council',sourceUrl:source.href,lessons};
}
type ImportOptions = { fetcher?: typeof fetch };
const LEVEL_PATH = /\/(?:free-resources|skills)\/(?:speaking|reading|listening|writing)\/(?:a1|a2|b1|b2|c1|c2)(?:-[a-z0-9-]+)?$/;
const SPEAKING_ROOT = 'https://learnenglish.britishcouncil.org/free-resources/speaking';
function isYoutubeVideo(url:URL):boolean {
 if(url.hostname==='youtu.be')return /^\/[-\w]{11}\/?$/.test(url.pathname);
 return url.pathname==='/watch'&&/^[-\w]{11}$/.test(url.searchParams.get('v')??'')||/^\/(?:shorts|live|embed)\/[-\w]{11}\/?$/.test(url.pathname);
}
function incompletePlatform(url:URL):string|undefined {
 const host=url.hostname.replace(/^www\./,'');
 if(host==='podcasts.apple.com'||host==='music.yandex.ru'||host==='castbox.fm'||host==='pocketcasts.com')return 'Podcast catalogue pages do not show the full archive. Paste the publisher’s direct RSS/Atom link.';
 if(host==='soundcloud.com'&&/\/sets\//.test(url.pathname))return 'SoundCloud playlists are paginated and require a separate API. For now, paste item links as a list.';
 if(host==='drive.google.com'&&url.pathname.startsWith('/drive/folders/'))return 'A Google Drive folder requires separate access and pagination. For now, paste public file links as a list.';
 if((host==='vimeo.com'&&url.pathname.startsWith('/showcase/'))||host==='loom.com'&&url.pathname.startsWith('/share/folder/'))return 'This video collection is loaded page by page. For now, paste video links as a list.';
 if(host==='coursera.org'&&/^\/learn\/[^/]+\/?$/.test(url.pathname)||host==='udemy.com'&&url.pathname.startsWith('/course/')||host==='edx.org'&&url.pathname.startsWith('/learn/')||host.endsWith('.skillshare.com')||host==='skillshare.com'&&url.pathname.startsWith('/classes/'))
  return 'The platform loads its syllabus dynamically and may require signing in. To avoid saving an incomplete course, paste lesson links as a list.';
 if((host==='instagram.com'||host==='tiktok.com'||host==='pinterest.com')&&url.pathname.split('/').filter(Boolean).length<=2)return 'A profile with infinite scrolling cannot be reliably treated as a complete course. Paste selected posts as a list.';
}
function catalogCopy(url: URL): Course | null {
 const canonical=url.href.replace('/skills/','/free-resources/');
 const item=catalog.courses.find(c=>c.sourceUrl===canonical);
 const notice='Backup catalogue · 13 Oct 2026';
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
    if(!target)throw new Error('Couldn’t open the link.');
    url=courseUrl(new URL(target,url).href); continue;
   }
   break;
  }
  if (!response?.ok) throw new Error('The site did not provide the page. Try again later or paste links as a list.');
  if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('There is no page with learning materials at this link.');
  const reader=response.body?.getReader(); if(!reader) throw new Error('The page is empty.');
  const decoder=new TextDecoder(); let html=''; let bytes=0;
  while(true) {
   const {done,value}=await reader.read(); if(done)break; bytes+=value.length;
   if(bytes>2_000_000){await reader.cancel();throw new Error('The page is too large. Paste links as a list.');}
   html+=decoder.decode(value,{stream:true});
  }
  html+=decoder.decode(); return parseCourse(html,url);
 } catch(error) {
  // Known public course link snapshots keep import usable if the source rejects server requests.
  const saved=catalogCopy(url);
  if(saved)return saved;
  if(error instanceof Error && error.name==='AbortError')throw new Error('The site is taking too long to respond. Try again later.');
  throw error;
 } finally { clearTimeout(timeout); }
}
export async function fetchCourse(value: string, options: ImportOptions = {}): Promise<Course> {
 const fetcher=options.fetcher ?? fetch;
 if(isYoutube(value)){
  const url=publicUrl(value);
  if(url.searchParams.has('list'))return fetchYoutube(value,fetcher);
  if(isYoutubeVideo(url))return singlePage(url,'YouTube','One link, one day. You can edit the title.');
  throw new Error('A YouTube channel link does not provide a verifiable full video list. Choose a channel playlist or paste links as a list.');
 }
 if(isVergavi(value))return fetchVergavi(value,fetcher);
 if(isSpotify(value))return fetchSpotify(value,fetcher);
 if(isStepik(value))return fetchStepik(value,fetcher);
 if(isFeedUrl(value))return fetchFeed(value,fetcher);
 let url:URL;try{url=new URL(value)}catch{return fetchWebCourse(value,fetcher)}
 const risk=incompletePlatform(url);if(risk)throw new Error(risk);
 const host=url.hostname;
 if(host!=='learnenglish.britishcouncil.org')return fetchWebCourse(value,fetcher);
 const root=await fetchIndex(value,fetcher);
 if(!root.lessons.length || !root.lessons.every(l=>LEVEL_PATH.test(new URL(l.url).pathname)))return root;
 if(root.lessons.length>8)throw new Error('Choose an individual section or level.');
 const sections=await Promise.all(root.lessons.map(l=>fetchIndex(l.url,fetcher)));
 const seen=new Set<string>();
 const lessons=sections.flatMap(c=>c.lessons.map(l=>({...l,group:c.title.split(' ')[0].toUpperCase()}))).filter(l=>{
  if(seen.has(l.url))return false;seen.add(l.url);return true;
 });
 if(!lessons.length || lessons.length>200)throw new Error('Choose an individual level.');
 return {...root,lessons,importNotice:root.importNotice??sections.find(c=>c.importNotice)?.importNotice};
}
