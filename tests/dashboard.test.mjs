import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterCourses,resumeCourse} from '../lib/dashboard.ts';
import {planCourseId} from '../lib/navigation.ts';
const courses=[
 {id:'empty',title:'Новая',source:'Links',lessons:[]},
 {id:'read',title:'Космос',source:'Naked Science',lessons:[{id:'one',completedAt:'2026-10-13',note:'Keep note'},{id:'two',completedAt:null,note:''}]},
 {id:'english',title:'English',source:'YouTube',lessons:[{id:'three',completedAt:null,note:''}]},
 {id:'done',title:'Completed',source:'Web',lessons:[{id:'four',completedAt:'2026-10-13',note:''}]}
];
test('Resume uses the selected unfinished course and skips empty or completed courses',()=>{
 assert.equal(resumeCourse(courses,'english'),courses[2]);
 for(const id of ['empty','done','missing'])assert.equal(resumeCourse(courses,id),courses[1]);
 assert.equal(resumeCourse([courses[0],courses[3]],'done'),undefined);
});
test('Search matches title or source without changing saved order and records',()=>{
 const original=structuredClone(courses);
 assert.deepEqual(filterCourses(courses,'  КОСМОС '),[courses[1]]);
 assert.deepEqual(filterCourses(courses,'youtube'),[courses[2]]);
 assert.deepEqual(filterCourses(courses,'unknown'),[]);
 assert.equal(filterCourses(courses,'  '),courses);
 assert.deepEqual(courses,original);
});
test('Existing course bookmarks take priority; missing IDs safely fall back to the saved selection',()=>{
 assert.equal(planCourseId(courses,'english','read'),'english');
 assert.equal(planCourseId(courses,'missing','read'),'read');
 assert.equal(planCourseId(courses,null,'missing'),'empty');
 assert.equal(planCourseId([],null,null),'');
});
