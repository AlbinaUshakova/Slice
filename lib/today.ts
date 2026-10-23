import {localDay,nextLesson,type Course,type Lesson} from './course.ts';
export type TodayItem={course:Course;lesson:Lesson;done:boolean;day:number};
export function todayItems(courses:Course[],now=new Date()):TodayItem[]{
 const today=localDay(now);
 return courses.flatMap(course=>{
  if(course.planStart&&course.planStart>today)return [];
  // A completed item holds its place all day, including after a reload.
  const completed=course.lessons.find(l=>l.completedAt&&localDay(new Date(l.completedAt))===today);
  const lesson=completed??nextLesson(course);
  return lesson?[{course,lesson,done:!!completed,day:course.lessons.findIndex(l=>l.id===lesson.id)+1}]:[];
 });
}
