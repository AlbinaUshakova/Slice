import {validCourses,type Course} from './course.ts';
import {BRAND_NAME} from './brand.ts';
export const MAX_BACKUP_BYTES=10*1024*1024;
export function parseBackup(text:string):Course[]{
 if(new Blob([text]).size>MAX_BACKUP_BYTES)throw new Error('Файл слишком большой. Максимум — 10 МБ.');
 let value:unknown;try{value=JSON.parse(text)}catch{throw new Error(`Не удалось прочитать файл. Выбери копию ${BRAND_NAME} в формате JSON.`)}
 if(!validCourses(value))throw new Error(`В файле нет корректной копии ${BRAND_NAME}.`);
 return value;
}
// Current records always win: restoring an older copy cannot erase recent work.
export function mergeBackup(current:Course[],incoming:Course[]):Course[]{
 const result=current.map(course=>{
  const saved=incoming.find(c=>c.id===course.id);if(!saved)return course;
  const ids=new Set(course.lessons.map(l=>l.id));
  return {...course,lessons:[...course.lessons,...saved.lessons.filter(l=>!ids.has(l.id))]};
 });
 const ids=new Set(current.map(c=>c.id));result.push(...incoming.filter(c=>!ids.has(c.id)));
 if(!validCourses(result))throw new Error('Не помещается: до 30 подборок и 2000 материалов в каждой.');
 return result;
}
