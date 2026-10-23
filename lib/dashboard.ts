import {nextLesson,localDay,type Course} from './course.ts';
export function filterCourses(courses:Course[],query:string):Course[]{
 const needle=query.trim().toLocaleLowerCase('en');
 return needle?courses.filter(c=>(c.title+' '+c.source).toLocaleLowerCase('en').includes(needle)):courses;
}
export function resumeCourse(courses:Course[],active:string):Course|undefined {
 return courses.find(c=>c.id===active&&nextLesson(c))??courses.find(c=>nextLesson(c));
}

export type CourseFilter='all'|'active'|'completed';
export function byStatus(courses:Course[],status:CourseFilter):Course[]{
 return courses.filter(c=>status==='all'||(status==='completed'?(c.lessons.length>0&&!nextLesson(c)):(!c.lessons.length||!!nextLesson(c))));
}
export function activitySummary(courses:Course[],now=new Date()){
 const counts=new Map<string,number>();let completed=0;
 for(const course of courses)for(const lesson of course.lessons){
  if(!lesson.completedAt)continue;
  const date=new Date(lesson.completedAt);if(!Number.isFinite(date.getTime())||date>now)continue;
  completed++;const day=localDay(date);counts.set(day,(counts.get(day)??0)+1);
 }
 const monday=new Date(now);monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const days=Array.from({length:7},(_,i)=>{const date=new Date(monday);date.setDate(date.getDate()+i);const key=localDay(date);return {key,count:counts.get(key)??0,today:key===localDay(now),future:key>localDay(now)}});
 return {completed,days,week:days.reduce((sum,day)=>sum+day.count,0)};
}
