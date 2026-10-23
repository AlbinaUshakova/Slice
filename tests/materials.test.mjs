import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renameMaterial,removeMaterial,reorderMaterials} from '../lib/materials.ts';
import {validCourses,plannedDay,nextLesson} from '../lib/course.ts';
import {appendCourse} from '../lib/append-course.ts';
import {recordingKey} from '../lib/recordings.ts';
const course={id:'reading',title:'Reading',source:'Example',sourceUrl:'https://example.com/course',planStart:'2026-10-13',lessons:[
 {id:'one',url:'https://example.com/course',title:'One',completedAt:'2026-10-13T08:00:00Z',note:'Keep first',group:'A1'},
 {id:'two',url:'https://example.com/course',title:'Two',completedAt:null,note:'Keep second',group:'A2'},
 {id:'three',url:'https://example.com/three',title:'Three',completedAt:null,note:''}
]};
test('Material rename persists without changing links, identity, progress, notes or audio association',()=>{
 const renamed=renameMaterial(course,'two','  New title  ');
 assert.equal(renamed.lessons[1].title,'New title');assert.equal(course.lessons[1].title,'Two');
 assert.deepEqual({...renamed.lessons[1],title:'Two'},course.lessons[1]);
 assert.equal(recordingKey(renamed.id,renamed.lessons[1].id),recordingKey(course.id,course.lessons[1].id));
 assert.equal(renameMaterial(course,'two','  '),course);assert.ok(validCourses(JSON.parse(JSON.stringify([renamed]))));
});
test('Reorder preserves material records and recalculates daily positions across page boundaries',()=>{
 const moved=reorderMaterials(course,'three','one');assert.deepEqual(moved.lessons.map(l=>l.id),['three','one','two']);
 assert.equal(moved.lessons[1],course.lessons[0]);assert.equal(moved.planStart,course.planStart);
 assert.equal(plannedDay(moved.planStart,2),'2026-10-15');assert.equal(nextLesson(moved).id,'three');
 assert.deepEqual(course.lessons.map(l=>l.id),['one','two','three']);assert.equal(reorderMaterials(course,'missing','two'),course);
 const large={...course,lessons:Array.from({length:100},(_,i)=>({...course.lessons[2],id:String(i)}))};
 const crossing=reorderMaterials(large,'49','50');assert.equal(crossing.lessons[50].id,'49');assert.equal(crossing.lessons[49].id,'50');
 assert.ok(validCourses([crossing]));
});
test('Deletion targets stable IDs even when topics share a URL; empty collections survive reload and accept new links',()=>{
 const without=removeMaterial(course,'two');assert.deepEqual(without.lessons.map(l=>l.id),['one','three']);assert.equal(without.lessons[0],course.lessons[0]);
 let empty=course;for(const l of course.lessons)empty=removeMaterial(empty,l.id);
 assert.equal(empty.id,course.id);assert.equal(empty.planStart,course.planStart);assert.equal(empty.lessons.length,0);
 const restored=JSON.parse(JSON.stringify([empty]));assert.ok(validCourses(restored));assert.equal(nextLesson(restored[0]),null);
 const refilled=appendCourse(restored[0],[course.lessons[2]]);assert.equal(refilled.lessons.length,1);assert.equal(refilled.id,course.id);assert.ok(validCourses([refilled]));
});
