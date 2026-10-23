import type {Course} from './course';

export function planCourseId(courses:Course[],requested:string|null,previous:string|null):string {
 return courses.find(course=>course.id===requested)?.id??courses.find(course=>course.id===previous)?.id??courses[0]?.id??'';
}
