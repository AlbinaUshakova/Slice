import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchCourse} from '../lib/importer.ts';
import {parseVergavi,vergaviUrl,fetchVergavi} from '../lib/vergavi.ts';
import {mergeCourse,validCourses} from '../lib/course.ts';

const html=`<h2><a href="/program/a1">A1</a></h2>
<h3><a href="/program/a1/alphabet-1">Юнит 1 — Алфавит &amp; звуки</a></h3>
<h3><a href="/program/a1/alphabet-1">Дубликат</a></h3>
<h3><a href="https://evil.example/program/a1/leak">Чужой домен</a></h3>
<h3><a href="/login">Войти</a></h3>
<h3><a href="/program/a2/future-preverb">Юнит 21 — Будущее время</a></h3>
<h3>Скоро: новые темы</h3>`;
test('Vergavi /learn imports the public outline without fetching protected lessons',async()=>{
 const calls=[];
 const course=await fetchCourse('https://vergavi.ge/learn?tracking=1',{fetcher:async(url,options)=>{calls.push(String(url));assert.equal(options.redirect,'manual');return new Response(html,{headers:{'content-type':'text/html'}})}});
 assert.deepEqual(calls,['https://vergavi.ge/program']);
 assert.equal(course.lessons.length,2);assert.deepEqual(course.lessons.map(l=>l.group),['A1','A2']);
 assert.equal(course.lessons[0].title,'Юнит 1 — Алфавит & звуки');
 assert.match(course.importNotice,/one unit per day/);assert.match(course.importNotice,/signing in/);
 assert.ok(validCourses([course]));
 const saved={...course,lessons:course.lessons.map(l=>({...l,note:'Мои заметки',completedAt:'2026-10-13T07:00:00Z'}))};
 assert.equal(mergeCourse(saved,course).lessons[0].note,'Мои заметки');
});
test('A single level excludes other levels and unpublished headings',()=>{
 const course=parseVergavi(html,vergaviUrl('https://vergavi.ge/program/a1/'));
 assert.equal(course.lessons.length,1);assert.equal(course.lessons[0].group,'A1');
 assert.throws(()=>parseVergavi('<h1>Войти</h1>',vergaviUrl('https://vergavi.ge/learn')),/requires signing in/);
});
test('Level links use the shared public outline despite their different card markup',async()=>{
 const calls=[];
 const course=await fetchVergavi('https://vergavi.ge/program/a1',async url=>{calls.push(String(url));return new Response(html,{headers:{'content-type':'text/html'}})});
 assert.deepEqual(calls,['https://vergavi.ge/program']);
 assert.equal(course.sourceUrl,'https://vergavi.ge/program/a1');
 assert.deepEqual(course.lessons.map(l=>l.group),['A1']);
});
test('Vergavi rejects unsafe destinations and does not follow external or login redirects',async()=>{
 for(const url of ['http://vergavi.ge/learn','https://vergavi.ge.evil.example/learn','https://user:pass@vergavi.ge/learn','https://vergavi.ge:444/learn','https://vergavi.ge/admin'])assert.throws(()=>vergaviUrl(url));
 for(const location of ['https://127.0.0.1/program','https://evil.example/program','/login']){
  let calls=0;await assert.rejects(fetchVergavi('https://vergavi.ge/learn',async()=>{calls++;return new Response(null,{status:302,headers:{location}})}));assert.equal(calls,1);
 }
});
test('Failed and oversized public responses do not produce fake course plans',async()=>{
 await assert.rejects(fetchVergavi('https://vergavi.ge/learn',async()=>new Response('blocked',{status:403})),/public Vergavi programme/);
 await assert.rejects(fetchVergavi('https://vergavi.ge/learn',async()=>new Response('x'.repeat(2_000_001),{headers:{'content-type':'text/html'}})),/too large/);
});
