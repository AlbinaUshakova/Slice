import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchCourse} from '../lib/importer.ts';
import {validCourses,mergeCourse,completeLesson,plannedDay} from '../lib/course.ts';
const root='https://learnenglish.britishcouncil.org/free-resources/speaking';
const denied=async()=>new Response('Forbidden',{status:403});
test('B1 remains importable when the source refuses deployed server requests',async()=>{
 const c=await fetchCourse(root+'/b1',{fetcher:denied});
 assert.equal(c.lessons.length,5);assert.ok(validCourses([c]));
 assert.equal(c.lessons[0].title,'Agreeing and disagreeing');
 assert.equal(c.lessons[4].url,root+'/b1/responding-news');
 assert.match(c.importNotice,/13 Oct 2026/);
});
test('Speaking expands all four levels to twenty actual lessons in CEFR order',async()=>{
 const c=await fetchCourse(root,{fetcher:denied});
 assert.equal(c.lessons.length,20);
 assert.deepEqual([...new Set(c.lessons.map(l=>l.group))],['A1','A2','B1','B2']);
 assert.ok(c.lessons.every(l=>new URL(l.url).pathname.split('/').length===5));
 assert.equal(c.lessons[10].title,'Agreeing and disagreeing');
 assert.equal(new Set(c.lessons.map(l=>l.url)).size,20);
 assert.ok(validCourses([c]));
});
test('Live HTML sections are expanded, not saved as lesson placeholders',async()=>{
 const fetcher=async input=>{
  const path=new URL(input).pathname;
  const html=path.endsWith('/speaking')?`<h1>Speaking</h1><h2><a href='${root}/b1'>B1 speaking</a></h2>`:`<h1>B1 speaking</h1><h2><a href='${root}/b1/test-lesson'>A live lesson</a></h2>`;
  return new Response(html,{headers:{'content-type':'text/html'}});
 };
 const c=await fetchCourse(root,{fetcher});
 assert.equal(c.lessons.length,1);assert.equal(c.lessons[0].title,'A live lesson');
 assert.equal(c.lessons[0].group,'B1');assert.equal(c.importNotice,undefined);
});
test('Level selection produces a five-day plan and reimport keeps the notes and completion',async()=>{
 const all=await fetchCourse(root,{fetcher:denied});
 const b1={...all,lessons:all.lessons.filter(l=>l.group==='B1'),planStart:'2026-10-13'};
 assert.equal(b1.lessons.length,5);assert.equal(plannedDay(b1.planStart,4),'2026-10-17');
 const finished=completeLesson(b1,b1.lessons[0].id,'2026-10-13T04:00:00Z');finished.lessons[0].note='Saved insight';
 const restored=mergeCourse(finished,b1);
 assert.equal(restored.lessons[0].note,'Saved insight');assert.ok(restored.lessons[0].completedAt);
 assert.ok(validCourses(JSON.parse(JSON.stringify([restored]))));
});
test('Unknown blocked course URLs do not receive an unrelated cached course',async()=>{
 await assert.rejects(()=>fetchCourse('https://learnenglish.britishcouncil.org/free-resources/writing/c1',{fetcher:denied}));
});
