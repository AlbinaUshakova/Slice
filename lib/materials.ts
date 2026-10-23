import type {Course} from './course';
export function renameMaterial(course:Course,id:string,value:string):Course {
 const title=value.trim().slice(0,200);
 if(!title)return course;
 return {...course,lessons:course.lessons.map(l=>l.id===id?{...l,title}:l)};
}
export function removeMaterial(course:Course,id:string):Course {
 return {...course,lessons:course.lessons.filter(l=>l.id!==id)};
}
export function reorderMaterials(course:Course,id:string,targetId:string):Course {
 const from=course.lessons.findIndex(l=>l.id===id),to=course.lessons.findIndex(l=>l.id===targetId);
 if(from<0||to<0||from===to)return course;
 const lessons=[...course.lessons], [item]=lessons.splice(from,1);lessons.splice(to,0,item);
 return {...course,lessons};
}
