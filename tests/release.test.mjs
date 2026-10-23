import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBackup,mergeBackup} from '../lib/backup.ts';
import {validCourses} from '../lib/course.ts';
import {activitySummary,byStatus} from '../lib/dashboard.ts';
const lesson=(id,completedAt=null)=>({id,title:id,url:'https://example.com/'+id,note:'',completedAt});
const course={id:'course',title:'My course',source:'Web',sourceUrl:'https://example.com',lessons:[{...lesson('one','2026-10-13T08:00:00Z'),note:'Recent note'}]};
test('Backup restores absent records without overwriting newer notes, titles, order or completion',()=>{
 const incoming=[{...course,title:'Old title',lessons:[{...lesson('one'),note:'Old note'},lesson('two')]},{...course,id:'second'}];
 const before=structuredClone(course),result=mergeBackup([course],parseBackup(JSON.stringify(incoming)));
 assert.deepEqual(result.map(c=>c.id),['course','second']);assert.equal(result[0].title,'My course');
 assert.deepEqual(result[0].lessons,[course.lessons[0],lesson('two')]);assert.deepEqual(course,before);
 assert.deepEqual(mergeBackup(result,incoming),result);
 assert.deepEqual(mergeBackup([],parseBackup(JSON.stringify([course]))),[course]);
});
test('Malformed backups and duplicate identities are rejected without throwing inside the validator',()=>{
 for(const value of [null,{},[null],[{...course,lessons:[null]}],[{...course,lessons:[{}]}],[course,course],[{...course,lessons:[lesson('x'),lesson('x')]}],[{...course,planStart:'2026-02-30'}],[{...course,lessons:[{...lesson('x'),url:'javascript:alert(1)'}]}]]){
  assert.equal(validCourses(value),false);assert.throws(()=>parseBackup(JSON.stringify(value)));
 }
 assert.throws(()=>parseBackup('not JSON'));assert.ok(validCourses([{...course,lessons:[]}]));
});
test('Restore checks combined capacity before committing',()=>{
 const full=Array.from({length:30},(_,i)=>({...course,id:String(i)}));
 assert.throws(()=>mergeBackup(full,[course]),/30/);
 const many={...course,lessons:Array.from({length:2000},(_,i)=>lesson(String(i)))};
 assert.throws(()=>mergeBackup([many],[{...course,lessons:[lesson('extra')]}]),/2000/);
 assert.equal(full.length,30);assert.equal(many.lessons.length,2000);
});
test('Weekly activity uses local calendar days, Monday boundaries, and excludes future dates',()=>{
 const now=new Date(2026,9,13,15),iso=(day)=>new Date(2026,9,day,10).toISOString();
 const data=[{...course,lessons:[lesson('sunday',iso(11)),lesson('monday',iso(12)),lesson('today',iso(13)),lesson('also-today',iso(13)),lesson('future',iso(14)),lesson('pending')]}];
 const summary=activitySummary(data,now);
 assert.equal(summary.week,3);assert.equal(summary.completed,4);assert.equal(summary.days[0].key,'2026-10-12');assert.equal(summary.days[1].count,2);assert.equal(summary.days[1].today,true);assert.equal(summary.days[2].future,true);
 const monday=activitySummary(data,new Date(2026,9,19,12));assert.equal(monday.week,0);
});
test('Completed filter excludes empty collections and composes with active state',()=>{
 const data=[course,{...course,id:'active',lessons:[lesson('pending')]},{...course,id:'empty',lessons:[]}];
 assert.deepEqual(byStatus(data,'completed'),[course]);assert.deepEqual(byStatus(data,'active'),data.slice(1));assert.deepEqual(byStatus(data,'all'),data);
});
