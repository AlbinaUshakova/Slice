import type {Course,Lesson} from './course';
export function newLessons(existing:Course,incoming:Lesson[]):Lesson[]{
 const ids=new Set(existing.lessons.map(l=>l.id)),urls=new Set(existing.lessons.map(l=>l.url));
 return incoming.filter(l=>{
  // Outline topics may intentionally share one page. Their stable IDs distinguish them.
  if(ids.has(l.id)||(l.id===l.url&&urls.has(l.url)))return false;
  ids.add(l.id);urls.add(l.url);return true;
 });
}
export function appendCourse(existing:Course,incoming:Lesson[]):Course{
 const added=newLessons(existing,incoming);
 if(existing.lessons.length+added.length>2000)throw new Error('В одной подборке — до 2000 материалов.');
 return {...existing,lessons:[...existing.lessons,...added]};
}
