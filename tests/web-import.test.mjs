import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWebPage,fetchWebCourse} from '../lib/web-import.ts';
import {publicUrl,isPublicAddress,readPublicPage} from '../lib/public-page.ts';
import {parseLinkInput} from '../lib/link-input.ts';
import {newLessons,appendCourse} from '../lib/append-course.ts';
import {mergeCourse,validCourses,plannedDay} from '../lib/course.ts';
import {fetchCourse} from '../lib/importer.ts';
const source=new URL('https://reading.org/topics/space');
const page=html=>new Response(html,{headers:{'Content-Type':'text/html'}});
const dns=(ip='104.21.1.2')=>Response.json({Status:0,Answer:[{type:1,data:ip}]});
function withDns(handler){return async (url,options)=>new URL(url).hostname==='cloudflare-dns.com'?(assert.equal(options.redirect,'manual'),dns()):handler(url,options)}

test('Article cards import in document order, without navigation, related items, ratings or duplicates',()=>{
 const course=parseWebPage(`<h1>Space</h1><nav><h2><a href='/login'>Login</a></h2></nav><main>
 <h3><a href='/article/one?utm_source=site'>Coffee &amp; stars <span class='rating'>4.8</span></a></h3>
 <h3><a href='/article/one'>Duplicate</a></h3><article><h2>Second article</h2><a href='/article/two'>Read more</a></article>
 <a href='/article/three'><h3>Third article</h3></a><h3><a href='javascript:alert(1)'>Wrong</a></h3>
 <aside><h3><a href='/article/outside'>Outside</a></h3></aside>
 <div class='related-posts'><h3><a href='/article/related'>Related</a></h3></div>
 </main><footer><h3><a href='/article/footer'>Footer</a></h3></footer>`,source);
 assert.deepEqual(course.lessons.map(l=>l.title),['Coffee & stars','Second article','Third article']);
 assert.deepEqual(course.lessons.map(l=>l.url),['https://reading.org/article/one','https://reading.org/article/two','https://reading.org/article/three']);
 assert.ok(validCourses([course]));
});
test('Naked Science tag page is a list even when og:type says article; exclude event announcements',()=>{
 const course=parseWebPage(`<meta property='og:type' content='article'><h1>#космос</h1><div id='ns-tag-news'>
 <h3><a href='/community/1'>Новость о космосе</a></h3><h3><a href='/events/one'>Встреча</a></h3>
 <h3><a href='/article/astronomy/two'>Научная статья <span class='index_importance_news'>4.3</span></a></h3>
 </div><h3><a href='/article/outside'>За пределами раздела</a></h3>`,new URL('https://naked-science.ru/tags/kosmos'));
 assert.deepEqual(course.lessons.map(l=>l.title),['Новость о космосе','Научная статья']);
 assert.match(course.importNotice,/later pages/);
});
test('Aferin-style outline preserves topic order and levels without invented lesson links',()=>{
 const course=parseWebPage(`<main><h1>Program</h1><h2>A1 · Başlangıç</h2><ul>
 <li data-testid='program-unit'><div><h3>Alfabe ve sesler</h3></div><span>Открыто</span></li>
 <li data-testid='program-unit'><h3>Tanışma</h3><span>Открыто</span></li>
 <li data-testid='program-unit'><h3>Later</h3><span>Скоро</span></li></ul>
 <h2>A2 · Temel</h2><li data-testid='program-unit'><h3>Geçmiş zaman</h3></li></main>`,new URL('https://aferin.me/program'));
 assert.equal(course.lessons.length,3);assert.deepEqual(course.lessons.map(l=>l.group),['A1','A1','A2']);
 assert.ok(course.lessons.every(l=>l.url==='https://aferin.me/program'));assert.ok(validCourses([course]));
 const saved=structuredClone(course);saved.lessons[0].note='First only';saved.lessons[0].completedAt='2026-10-13T07:00:00Z';
 saved.lessons[1].note='Second only';
 const reimport=mergeCourse(saved,{...course,lessons:[...course.lessons].reverse()});
 assert.equal(reimport.lessons[2].note,'First only');assert.equal(reimport.lessons[1].note,'Second only');
 assert.equal(reimport.lessons[0].note,'');assert.equal(reimport.lessons[1].completedAt,null);
 assert.match(course.importNotice,/shared page/);
});
test('Single articles stay single and unknown or JS-only pages have an honest one-page fallback',async()=>{
 const one=parseWebPage(`<meta property='og:type' content='article'><h1>Actual article</h1><h2><a href='/story/other'>Other</a></h2>`,new URL('https://reading.org/story/one'));
 assert.equal(one.lessons.length,1);assert.equal(one.lessons[0].url,'https://reading.org/story/one');
 const blocked=await fetchWebCourse(source.href,withDns(()=>new Response('Forbidden',{status:403})));
 assert.equal(blocked.lessons.length,1);assert.match(blocked.importNotice,/Couldn’t/);
 const js=await fetchWebCourse(source.href,withDns(()=>page('<div id="app"></div>')));
 assert.match(js.importNotice,/No item list was found/);
 const redirect=await fetchWebCourse(source.href,withDns(url=>new URL(url).pathname==='/login'?page('<h1>Sign in</h1>'):new Response(null,{status:302,headers:{location:'/login'}})));
 assert.equal(redirect.lessons[0].url,source.href);assert.match(redirect.importNotice,/requires signing in/);
});
test('Pasted links form one item per line, keep Telegram message fragments, titles, and remove duplicates',()=>{
 const {lessons,discover}=parseLinkInput('  https://web.telegram.org/a/#-1001277008397_pinned\nСтатья | https://reading.org/a\r\nhttps://reading.org/a\nhttps://t.me/c/1277008397/123');
 assert.equal(discover,false);assert.equal(lessons.length,3);assert.equal(lessons[1].title,'Статья');
 assert.match(lessons[0].url,/#-1001277008397_pinned$/);assert.match(lessons[2].url,/\/123$/);
 assert.equal(parseLinkInput(source.href).discover,true);
 assert.equal(parseLinkInput('Один материал | '+source.href).discover,false);
 for(const input of ['', 'javascript:alert(1)', 'https://u:secret@reading.org', 'https://reading.org/a\nnope'])assert.throws(()=>parseLinkInput(input));
});
test('Telegram web/pinned links and single YouTube videos do not fetch private content or unrelated recommendations',async()=>{
 for(const url of ['https://web.telegram.org/a/#-1001277008397_pinned','https://t.me/c/1277008397/123','https://youtu.be/abcdefghi12']){
  const c=await fetchCourse(url,{fetcher:()=>{throw new Error('Must not request')}});
  assert.equal(c.lessons.length,1);assert.equal(c.lessons[0].url,url);assert.ok(c.importNotice);
 }
});
test('Known dynamic collections fail clearly instead of pretending the first page is complete',async()=>{
 for(const url of ['https://www.youtube.com/@english/videos','https://www.coursera.org/learn/english','https://podcasts.apple.com/us/podcast/show/id123456789','https://drive.google.com/drive/folders/abc']){
  await assert.rejects(()=>fetchCourse(url,{fetcher:()=>{throw new Error('Must not request')}}),/playlist|dynamically|RSS|Google Drive/);
 }
});
test('Append keeps course identity, start date, progress and notes; repeats are skipped and dates continue',()=>{
 const original={...parseWebPage('<h1>Reading</h1><h2><a href="/story/one">First article</a></h2>',source),planStart:'2026-10-13'};
 original.lessons[0].completedAt='2026-10-13T07:00:00Z';original.lessons[0].note='Keep this';
 const more=parseLinkInput('https://reading.org/story/one\nhttps://reading.org/story/two').lessons;
 const result=appendCourse(original,more);
 assert.equal(result.id,original.id);assert.equal(result.title,original.title);assert.equal(result.planStart,original.planStart);
 assert.equal(result.lessons.length,2);assert.equal(result.lessons[0],original.lessons[0]);assert.equal(original.lessons.length,1);
 assert.equal(plannedDay(result.planStart,1),'2026-10-14');assert.ok(validCourses([JSON.parse(JSON.stringify(result))]));
 assert.equal(newLessons(result,more).length,0);
 const full={...original,lessons:Array.from({length:2000},(_,i)=>({...original.lessons[0],id:String(i),url:'https://reading.org/'+i}))};
 assert.throws(()=>appendCourse(full,more),/2,000/);
});
test('Public URL validation rejects local hosts, numeric IP variants, credentials and unusual ports',()=>{
 for(const value of ['file:///etc/passwd','http://localhost/a','http://sub.localhost/a','http://10.0.0.1','http://2130706433','http://0x7f000001','http://[::1]','https://x:pass@reading.org','https://reading.org:8443','http://metadata.google.internal'])assert.throws(()=>publicUrl(value));
 for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','172.20.0.1','192.168.1.1','100.64.0.1','192.0.2.1','198.18.0.1','203.0.113.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','2001:db8::1','2002:7f00:1::'])assert.equal(isPublicAddress(address),false,address);
 for(const address of ['104.21.1.2','172.67.12.2','2606:4700::1111'])assert.equal(isPublicAddress(address),true,address);
});
test('DNS and every redirect are checked before fetching; credentials are never forwarded',async()=>{
 let pageCalls=0;
 await assert.rejects(readPublicPage(source.href,async url=>{if(new URL(url).hostname==='cloudflare-dns.com')return dns('127.0.0.1');pageCalls++;return page('bad')}),/public import/);
 assert.equal(pageCalls,0);
 await assert.rejects(readPublicPage(source.href,withDns((_url,options)=>{
  pageCalls++;assert.equal(options.redirect,'manual');assert.equal(options.headers.Cookie,undefined);assert.equal(options.headers.Authorization,undefined);
  return new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest'}});
 })),/public link/);assert.equal(pageCalls,1);
 const ok=await readPublicPage(source.href,withDns(()=>page('<h1>OK</h1>')));assert.match(ok.html,/OK/);
 await assert.rejects(readPublicPage(source.href,withDns(()=>page('x'.repeat(2_000_001)))),/large/);
});
