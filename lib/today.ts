import {localDay,nextLesson,type Course,type Lesson} from './course.ts';
export type TodayItem={course:Course;lesson:Lesson;done:boolean;day:number};
export function todayItems(courses:Course[],now=new Date()):TodayItem[]{
 const today=localDay(now);
 return courses.flatMap(course=>{
  if(course.planStart&&course.planStart>today)return [];
  const completed=course.lessons.filter(l=>l.completedAt&&localDay(new Date(l.completedAt))===today);
  const capacity=course.pace==='twice-daily'?2:1;
  const weekend=now.getDay()===0||now.getDay()===6;
  const available=course.pace==='weekdays'&&weekend?0:Math.max(0,capacity-completed.length);
  const queued=course.lessons.filter(l=>!l.completedAt).slice(0,available);
  return [...completed,...queued].map(lesson=>({course,lesson,done:!!lesson.completedAt,day:course.lessons.findIndex(l=>l.id===lesson.id)+1}));
 });
}
