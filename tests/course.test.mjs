import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialCourse,nextLesson,completeLesson,mergeCourse,validCourses,removeCourse,plannedDay} from '../lib/course.ts';
import {courseUrl,parseCourse} from '../lib/importer.ts';
const base=structuredClone(initialCourse);
test('Completing, reopening and undoing a lesson preserve the ordered next lesson',()=>{
 const first=base.lessons[0];const second=base.lessons[1];
 const updated=completeLesson(base,first.id,'2026-10-13T06:30:00Z');
 assert.equal(nextLesson(updated).id,second.id);assert.equal(nextLesson(base).id,first.id);
 assert.equal(nextLesson(completeLesson(updated,first.id,null)).id,first.id);
 assert.equal(nextLesson({...base,lessons:base.lessons.map(l=>({...l,completedAt:'2026-10-13T06:30:00Z'}))}),null);
});
test('Out-of-order completion never skips an unfinished earlier lesson',()=>{
 assert.equal(nextLesson(completeLesson(base,base.lessons[4].id,'2026-10-13T06:30:00Z')).id,base.lessons[0].id);
});
test('Reimport preserves completion and notes while respecting the reviewed order',()=>{
 const existing={...completeLesson(base,base.lessons[0].id,'2026-10-13T06:30:00Z'),pace:'weekdays'};existing.lessons[0].note='My own note';
 const result=mergeCourse(existing,{...base,lessons:[...base.lessons].reverse()});
 assert.equal(result.lessons[0].id,base.lessons[4].id);assert.equal(result.lessons[4].note,'My own note');assert.ok(result.lessons[4].completedAt);
 assert.equal(result.pace,'weekdays');
 assert.ok(validCourses(JSON.parse(JSON.stringify([result]))));
});
test('Storage refuses corrupted data and executable URLs',()=>{
 assert.equal(validCourses([]),true);assert.equal(validCourses([{...base,lessons:[]}]),true);
 assert.equal(validCourses([{...base,lessons:[{...base.lessons[0],url:'javascript:alert(1)'}]}]),false);
 assert.equal(validCourses([{...base,lessons:[{...base.lessons[0],completedAt:'not-a-date'}]}]),false);
});
test('Importer refuses private hosts, embedded credentials and disguised source hosts',()=>{
 for(const url of ['http://127.0.0.1/free-resources/speaking/a2','https://learnenglish.britishcouncil.org.attacker.com/free-resources/speaking/a2','https://x:password@learnenglish.britishcouncil.org/free-resources/speaking/a2','https://learnenglish.britishcouncil.org:8443/free-resources/speaking/a2','file:///etc/passwd'])assert.throws(()=>courseUrl(url));
});
test('Parser retains lesson order, decodes titles and excludes navigation and duplicates',()=>{
 const url=courseUrl(base.sourceUrl);
 const html=`<h1>A2 speaking</h1><nav><a href='/login'>Login</a></nav><h2><a href='${url.pathname}/lesson-one'>Coffee &amp; tea</a></h2><h2><a href='${url.pathname}/lesson-one'>Duplicate</a></h2><h2><a href='https://example.com/other'>External</a></h2><h2><a href='${url.pathname}/lesson-two'>Say &#39;hello&#39;</a></h2><h2><a href='${url.pathname}/lesson-one/comments'>Comments</a></h2>`;
 const parsed=parseCourse(html,url);assert.deepEqual(parsed.lessons.map(l=>l.title),['Coffee & tea',"Say 'hello'"]);assert.equal(parsed.lessons.length,2);
 assert.throws(()=>parseCourse('<h1>No lessons</h1>',url));
});

test('Deleting a collection preserves the others and supports an empty saved library',()=>{
 const second={...base,id:'other',title:'Second'};
 const result=removeCourse([base,second],base.id,base.id);
 assert.deepEqual(result.courses,[second]);assert.equal(result.active,'other');
 assert.equal(removeCourse([base,second],'other',base.id).active,base.id);
 const empty=removeCourse(result.courses,'other','other');
 assert.deepEqual(empty,{courses:[],active:''});
 assert.ok(validCourses(JSON.parse(JSON.stringify(empty.courses))));
});
test('Daily plan spans months and leap years without losing days',()=>{
 assert.equal(plannedDay('2026-10-13',0),'2026-10-13');
 assert.equal(plannedDay('2026-10-13',19),'2026-11-01');
 assert.equal(plannedDay('2028-02-28',1),'2028-02-29');
 assert.equal(plannedDay('2028-02-28',2),'2028-03-01');
 assert.equal(plannedDay(undefined,2),null);
});
test('Pace changes the real calendar dates used by the plan',()=>{
 assert.equal(plannedDay('2026-10-23',0,'twice-daily'),'2026-10-23');
 assert.equal(plannedDay('2026-10-23',1,'twice-daily'),'2026-10-23');
 assert.equal(plannedDay('2026-10-23',2,'twice-daily'),'2026-10-24');
 assert.equal(plannedDay('2026-10-23',1,'weekdays'),'2026-10-26');
 assert.equal(plannedDay('2026-10-24',0,'weekdays'),'2026-10-26');
 assert.ok(validCourses([{...base,pace:'weekdays'}]));
 assert.equal(validCourses([{...base,pace:'weekends'}]),false);
});

test('Collection reordering persists without changing IDs, notes or completion',async()=>{
 const {reorderCourses}=await import('../lib/course.ts');
 const a={...structuredClone(base),id:'a'},b={...structuredClone(base),id:'b'},c={...structuredClone(base),id:'c'};
 b.lessons[0].note='Keep';b.lessons[0].completedAt='2026-10-13T08:00:00Z';
 const original=[a,b,c];const moved=reorderCourses(original,'b','a');
 assert.deepEqual(moved.map(c=>c.id),['b','a','c']);assert.deepEqual(original.map(c=>c.id),['a','b','c']);
 assert.equal(moved[0],b);assert.equal(moved[0].lessons[0].note,'Keep');
 assert.deepEqual(reorderCourses(moved,'b','c').map(c=>c.id),['a','c','b']);
 assert.equal(reorderCourses(original,'missing','a'),original);
 const saved=JSON.parse(JSON.stringify(moved));assert.ok(validCourses(saved));assert.deepEqual(saved.map(c=>c.id),['b','a','c']);
});
