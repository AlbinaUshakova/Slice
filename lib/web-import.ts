import {parse} from 'parse5';
import type {DefaultTreeAdapterTypes} from 'parse5';
import type {Course,Lesson} from './course';
import {publicUrl,readPublicPage,UnsafePage} from './public-page.ts';
type Node=DefaultTreeAdapterTypes.Node;
const attr=(node:Node,name:string)=>'attrs' in node?node.attrs.find(a=>a.name===name)?.value??'':'';
const tag=(node:Node)=>'tagName' in node?node.tagName:'';
const children=(node:Node):Node[]=>'childNodes' in node?node.childNodes:[];
function all(node:Node):Node[]{const result:Node[]=[],stack=[node];while(stack.length){const n=stack.pop()!;result.push(n);stack.push(...children(n).slice().reverse());}return result;}
function text(node:Node):string {
 const parts:string[]=[],stack=[node];
 while(stack.length){const n=stack.pop()!;if(/^(script|style|svg|button)$/.test(tag(n))||/rating|index_importance|badge/i.test(attr(n,'class')))continue;
  if('value' in n)parts.push(n.value);else stack.push(...children(n).slice().reverse());
 }return parts.join(' ').replace(/\s+/g,' ').trim();
}
function parent(node:Node):Node|undefined{return 'parentNode' in node?node.parentNode??undefined:undefined}
function closest(node:Node,predicate:(node:Node)=>boolean):Node|undefined{let n:Node|undefined=node;while(n){if(predicate(n))return n;n=parent(n)}}
function excluded(node:Node):boolean{
 return !!closest(node,n=>/^(nav|aside|footer|script|style|template|form|dialog)$/.test(tag(n))||
  attr(n,'aria-hidden')==='true'||('attrs' in n&&n.attrs.some(a=>a.name==='hidden'))||
  /(?:^|[\s_-])(?:sidebar|related|recommendations?|cookie|modal|popup|pagination|social|menu)(?:$|[\s_-])/i.test(attr(n,'class')+' '+attr(n,'id')));
}
function cleanLink(value:string,source:URL):URL|null{
 try{const url=publicUrl(new URL(value,source).href);
  if(url.origin!==source.origin||value.startsWith('#'))return null;
  for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))url.searchParams.delete(key);
  url.hash='';if(url.href.replace(/\/$/,'')===source.href.replace(/\/$/,''))return null;
  if(/\/(?:login|logout|signin|signup|register|account|privacy|terms|contact|search|tags?|category|author|page)(?:\/|$)/i.test(url.pathname))return null;
  return url;
 }catch{return null}
}
export function singlePage(source:URL,title?:string,notice?:string):Course{
 const name=(title||source.hostname).slice(0,120);
 return{id:source.href,title:name,source:source.hostname.replace(/^www\./,''),sourceUrl:source.href,
  importNotice:notice??'Список материалов не найден. Можно сохранить страницу на один день или вставить ссылки списком.',
  lessons:[{id:source.href,url:source.href,title:name,note:'',completedAt:null}]};
}
export function parseWebPage(html:string,source:URL):Course{
 const document=parse(html),nodes=all(document);
 const h1=nodes.find(n=>tag(n)==='h1'&&!excluded(n));
 const title=(h1?text(h1):text(nodes.find(n=>tag(n)==='title')??document)).slice(0,120)||source.hostname;
 const base=singlePage(source,title);
 // A full article is itself a daily item; related links must not replace it.
 const article=nodes.some(n=>tag(n)==='meta'&&attr(n,'property')==='og:type'&&attr(n,'content')==='article');
 const collectionPath=/\/(?:tags?|categor(?:y|ies)|topics?)(?:\/|$)/i.test(source.pathname)||/\/(?:blog|articles|news|program|courses)\/?$/i.test(source.pathname);
 if(article&&!collectionPath)return {...base,importNotice:'Одна статья — один день.'};
 if(/\/(?:login|signin|auth)(?:\/|$)/i.test(source.pathname)||nodes.some(n=>tag(n)==='input'&&attr(n,'type')==='password'))
  return singlePage(source,title,'Страница требует входа. Вставь ссылки на материалы списком или сохрани эту страницу на один день.');
 const naked=/^(?:www\.)?naked-science\.ru$/.test(source.hostname)&&source.pathname.startsWith('/tags/');
 const scope=(naked?nodes.find(n=>attr(n,'id')==='ns-tag-news'):undefined)??nodes.find(n=>tag(n)==='main'||attr(n,'role')==='main')??document;
 const content=all(scope).filter(n=>!excluded(n));
 const lessons:Lesson[]=[],seen=new Set<string>();let group='';
 function add(url:URL,name:string){if(!name||seen.has(url.href))return;seen.add(url.href);lessons.push({id:url.href,url:url.href,title:name.slice(0,200),note:'',completedAt:null});}
 for(const node of content){
  if(!/^h[2-6]$/.test(tag(node)))continue;
  const name=text(node);const level=/^([ABC][12])(?:\s|[·:—–-]|$)/i.exec(name);if(level)group=level[1].toUpperCase();
  const anchor=all(node).find(n=>tag(n)==='a'&&attr(n,'href'))??closest(parent(node)??node,n=>tag(n)==='a');
  if(anchor){const url=cleanLink(attr(anchor,'href'),source);if(url&&(!naked||/^\/(?:article|community|news|posts)\//.test(url.pathname)))add(url,name);continue;}
  const card=closest(node,n=>tag(n)==='article'||tag(n)==='li');
  if(!card)continue;
  const links=all(card).filter(n=>tag(n)==='a'&&attr(n,'href')).map(n=>cleanLink(attr(n,'href'),source)).filter((u):u is URL=>!!u);
  if(links.length){add(links[0],name);continue;}
  // Public outlines can expose topic names without exposing individual lesson URLs.
  const curriculum=attr(card,'data-testid')==='program-unit'||/(?:^|[\s_-])(?:unit|lesson|module)(?:$|[\s_-])/i.test(attr(card,'class'));
  if(curriculum&&name&&!/скоро|coming soon/i.test(text(card))){
   const id=source.href+'#topic='+encodeURIComponent((group?group+':':'')+name);
   if(!seen.has(id)){seen.add(id);lessons.push({id,url:source.href,title:name.slice(0,200),note:'',completedAt:null,...(group?{group}:{})});}
  }
 }
 // Plain reading lists often have no heading in each <li>.
 if(!lessons.length)for(const node of content){
  if(tag(node)!=='li')continue;
  const anchors=all(node).filter(n=>tag(n)==='a'&&attr(n,'href'));
  if(anchors.length!==1)continue;
  const name=text(anchors[0]),url=cleanLink(attr(anchors[0],'href'),source);
  if(url&&name.length>=8)add(url,name);
 }
 if(!lessons.length)return base;
 const shared=lessons.some(l=>l.url===source.href);
 const notice=shared?'План по темам открытой программы. У тем нет отдельных ссылок: открывается общая страница.':
  'Материалы с этой страницы — по одному в день. Проверь список; следующие страницы и новые публикации автоматически не добавляются.';
 return {...base,lessons:lessons.slice(0,200),importNotice:notice+(lessons.length>200?' Показаны первые 200 материалов.':'')};
}
export async function fetchWebCourse(value:string,fetcher:typeof fetch=fetch):Promise<Course>{
 const source=publicUrl(value);
 if(/^(?:web\.telegram\.org|t\.me|telegram\.me)$/.test(source.hostname))return singlePage(source,'Telegram',
  'Ссылки из закрепа: скопируй их сюда, каждую с новой строки. Этот адрес можно сохранить одним пунктом; закрытые сообщения автоматически не читаются.');
 try{
  const page=await readPublicPage(value,fetcher);const course=parseWebPage(page.html,page.url);
  // Keep the submitted URL for fallback, especially when a site redirects to sign-in.
  if(course.lessons.length===1&&course.lessons[0].url===page.url.href)return {...course,id:source.href,sourceUrl:source.href,lessons:[{...course.lessons[0],id:source.href,url:source.href}]};
  return course;
 }catch(error){
  if(error instanceof UnsafePage)throw error;
  return singlePage(source,undefined,'Не удалось прочитать список на сайте. Можно сохранить эту ссылку на один день или вставить ссылки на материалы списком.');
 }
}
