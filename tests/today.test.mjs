import {test} from 'node:test';
import assert from 'node:assert/strict';
import {todayItems} from '../lib/today.ts';
import {completeLesson} from '../lib/course.ts';
const now=new Date(2026,9,13,15);
const lesson=id=>({id,title:id,url:'https://example.com/'+id,note:'Keep note',completedAt:null});
const course={id:'reading',title:'Reading',source:'Web',sourceUrl:'https://example.com',planStart:'2026-10-01',lessons:[lesson('one'),lesson('two')]};
test('Today offers one first unfinished item per eligible course in saved order without missed-day backlog',()=>{
 const courses=[course,{...course,id:'english'}, {...course,id:'empty',lessons:[]},{...course,id:'future',planStart:'2026-10-14'}];
 const items=todayItems(courses,now);assert.deepEqual(items.map(i=>[i.course.id,i.lesson.id,i.day,i.done]),[['reading','one',1,false],['english','one',1,false]]);
 assert.equal(courses[0].lessons[0].note,'Keep note');
});
test('Completion stays checked after rerender and reload, undo restores it and the next day advances',()=>{
 const completed=completeLesson(course,'one',new Date(now.getTime()+1).toISOString());
 const items=todayItems(JSON.parse(JSON.stringify([completed])),now);assert.equal(items[0].lesson.id,'one');assert.equal(items[0].done,true);
 const undone=completeLesson(completed,'one',null);assert.equal(todayItems([undone],now)[0].done,false);
 const tomorrow=new Date(2026,9,14,0,1);assert.equal(todayItems([completed],tomorrow)[0].lesson.id,'two');assert.equal(todayItems([completed],tomorrow)[0].done,false);
});
test('Final material remains visible on completion day; completed courses disappear the next day',()=>{
 const finished={...course,lessons:[{...lesson('one'),completedAt:now.toISOString()}]};
 assert.equal(todayItems([finished],now)[0].done,true);assert.equal(todayItems([finished],new Date(2026,9,14,0,1)).length,0);
});
test('An item completed out of order today satisfies today without skipping earlier unfinished work',()=>{
 const done=completeLesson(course,'two',now.toISOString());
 assert.equal(todayItems([done],now)[0].lesson.id,'two');assert.equal(todayItems([done],new Date(2026,9,14,12))[0].lesson.id,'one');
});
test('Two-a-day and weekdays pace control the number of lessons shown today',()=>{
 const twice={...course,pace:'twice-daily',lessons:[lesson('one'),lesson('two'),lesson('three')]};
 assert.deepEqual(todayItems([twice],now).map(item=>item.lesson.id),['one','two']);
 const oneDone=completeLesson(twice,'one',now.toISOString());
 assert.deepEqual(todayItems([oneDone],now).map(item=>[item.lesson.id,item.done]),[['one',true],['two',false]]);
 const saturday=new Date(2026,9,17,12);
 const weekdays={...course,pace:'weekdays'};
 assert.equal(todayItems([weekdays],saturday).length,0);
});
