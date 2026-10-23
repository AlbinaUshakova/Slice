import {safeUrl} from './course.ts';
import type {Lesson} from './course';

/** A pasted list is already a plan: one line, one day. A single bare URL is discovered. */
export function parseLinkInput(value:string):{lessons:Lesson[];discover:boolean} {
 const lines=value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length)throw new Error('Добавь ссылку.');
 if(lines.length>200)throw new Error('До 200 ссылок за один раз.');
 const seen=new Set<string>();
 const lessons=lines.map((line,i):Lesson=>{
  const separator=line.lastIndexOf('|');
  const link=(separator<0?line:line.slice(separator+1)).trim();
  const supplied=separator<0?'':line.slice(0,separator).trim();
  if(link.length>2000||!safeUrl(link))throw new Error(`Проверь ссылку в строке ${i+1}.`);
  const url=new URL(link);
  let tail=url.pathname.split('/').filter(Boolean).at(-1)||'';
  try{tail=decodeURIComponent(tail)}catch{}
  const title=supplied||(/^[\d_-]+$/.test(tail)||!tail?`Материал ${i+1} · ${url.hostname}`:tail.replace(/[-_]/g,' '));
  return{id:url.href,url:url.href,title:title.slice(0,200),note:'',completedAt:null};
 }).filter(l=>{if(seen.has(l.url))return false;seen.add(l.url);return true});
 return {lessons,discover:lines.length===1&&!lines[0].includes('|')};
}
