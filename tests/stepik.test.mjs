import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchCourse} from '../lib/importer.ts';
import {stepikCourseUrl} from '../lib/stepik.ts';
import {validCourses,mergeCourse} from '../lib/course.ts';

const input='https://stepik.org/course/English-for-work-42/promo?tracking=1';
const payload=url=>{
 const path=url.pathname.replace('/api/','');
 if(path==='courses/42')return {courses:[{id:42,title:'English for work',sections:[10,20]}]};
 if(path==='sections')return {meta:{has_next:false},sections:[{id:10,title:'Start',units:[100,101]},{id:20,title:'Practice',units:[102]}]};
 if(path==='units')return {meta:{has_next:false},units:[{id:100,lesson:1000},{id:101,lesson:1001},{id:102,lesson:1002}]};
 if(path==='lessons')return {meta:{has_next:false},lessons:[{id:1000,title:'Introductions'},{id:1001,title:'Small talk'},{id:1002,title:'Meetings'}]};
 throw new Error('Unexpected '+url);
};
const fetcher=async url=>Response.json(payload(new URL(url)));

test('Stepik course URLs canonicalize and reject lessons, credentials and disguised hosts',()=>{
 assert.deepEqual(stepikCourseUrl(input),{id:42,url:new URL('https://stepik.org/course/42')});
 for(const bad of ['http://stepik.org/course/42','https://stepik.org.evil.test/course/42','https://user@stepik.org/course/42','https://stepik.org/lesson/42/step/1'])assert.throws(()=>stepikCourseUrl(bad));
});

test('Stepik importer preserves section and unit order and confirms the complete count',async()=>{
 const course=await fetchCourse(input,{fetcher});
 assert.equal(course.id,'https://stepik.org/course/42');assert.equal(course.lessons.length,3);
 assert.deepEqual(course.lessons.map(item=>item.title),['Introductions','Small talk','Meetings']);
 assert.deepEqual(course.lessons.map(item=>item.group),['Start','Start','Practice']);
 assert.match(course.importNotice,/Полная структура подтверждена/);assert.ok(validCourses([course]));
 const saved=structuredClone(course);saved.lessons[0].note='Keep';
 assert.equal(mergeCourse(saved,course).lessons[0].note,'Keep');
});

test('Stepik importer refuses partial structures instead of saving a shorter course',async()=>{
 await assert.rejects(()=>fetchCourse(input,{fetcher:async url=>{
  const data=payload(new URL(url));if('lessons' in data)data.lessons=data.lessons.slice(0,2);return Response.json(data);
 }}),/только часть курса/);
});
