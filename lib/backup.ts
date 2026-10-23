import {validCourses,type Course} from './course.ts';
import {BRAND_NAME} from './brand.ts';
export const MAX_BACKUP_BYTES=10*1024*1024;
export function parseBackup(text:string):Course[]{
 if(new Blob([text]).size>MAX_BACKUP_BYTES)throw new Error('The file is too large. Maximum size is 10 MB.');
 let value:unknown;try{value=JSON.parse(text)}catch{throw new Error(`Couldn’t read the file. Choose a ${BRAND_NAME} JSON backup.`)}
 if(!validCourses(value))throw new Error(`The file does not contain a valid ${BRAND_NAME} backup.`);
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
 if(!validCourses(result))throw new Error('The backup is too large: up to 30 collections and 2,000 items in each.');
 return result;
}
