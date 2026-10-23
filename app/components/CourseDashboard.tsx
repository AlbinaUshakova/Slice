'use client';
import {useEffect,useState} from 'react';
import CollectionList from './CollectionList';
import {ArrowRight,BookOpen,Check,MoreHorizontal,Pencil,Plus,Search,SlidersHorizontal,Trash2,X} from 'lucide-react';
import {nextLesson,type Course} from '@/lib/course';
import {filterCourses,resumeCourse,byStatus,activitySummary,type CourseFilter} from '@/lib/dashboard';
const sameLabel=(first:string,second:string)=>first.trim().toLocaleLowerCase('en')===second.trim().toLocaleLowerCase('en');
export default function CourseDashboard({courses,active,onPick,onAdd,onDelete,onRename,onReorder,query,onQuery}:{courses:Course[];active:string;onPick:(id:string)=>void;onAdd:()=>void;onDelete:(id:string)=>void;onRename:(id:string,title:string)=>void;onReorder:(id:string,target:string)=>void;query:string;onQuery:(query:string)=>void}){
 const [editing,setEditing]=useState<string|null>(null),[name,setName]=useState('');
 useEffect(()=>{setStatus('all');if(query.trim())setOrdering(false)},[query]);
 const [status,setStatus]=useState<CourseFilter>('all'),[ordering,setOrdering]=useState(false),[now,setNow]=useState(()=>new Date());
 useEffect(()=>{const update=()=>setNow(new Date());const timer=setInterval(update,60000);window.addEventListener('focus',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update)}},[]);
 const activity=activitySummary(courses,now);
 const filtered=byStatus(filterCourses(courses,query),status),resume=resumeCourse(courses,active),lesson=resume?nextLesson(resume):null;
 const done=resume?.lessons.filter(l=>!!l.completedAt).length??0;
 function rename(id:string){if(!name.trim())return;onRename(id,name.trim().slice(0,120));setEditing(null);}
 return <div className="library-home">
  <div className="library-heading"><h1>My plan</h1></div>
  {!query.trim()&&resume&&lesson&&<section className="resume-section" aria-labelledby="resume-title">
   <div className="resume-card">
    <div className="resume-copy"><h2 id="resume-title">Continue</h2><span className="resume-source">{resume.title}</span>{!sameLabel(resume.title,lesson.title)&&<h3>{lesson.title}</h3>}
     <div className="resume-progress"><div className="progress-track" role="progressbar" aria-label="Collection progress" aria-valuemin={0} aria-valuemax={resume.lessons.length} aria-valuenow={done}><span style={{width:`${100*done/resume.lessons.length}%`}}/></div><span>{done} / {resume.lessons.length}</span></div>
    </div>
    <button className="button primary resume-action" onClick={()=>onPick(resume.id)}>Open lesson<ArrowRight size={17}/></button>
   </div>
  </section>}
  {courses.length>0&&!query.trim()&&<section className="activity-panel" aria-label="Activity this week">
   <div className="activity-caption"><span>This week</span><strong>{activity.week}<small> completed</small></strong></div>
   <ol className="activity-week">{activity.days.map((day,i)=><li key={day.key} className={(day.count?'has-activity ':'')+(day.today?'is-today ':'')+(day.future?'is-future':'')} aria-label={`${day.key}: ${day.count} items${day.today?', today':''}`} title={`${day.key} · ${day.count}`}><span>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span><b>{day.count?<Check size={15}/>:day.key.slice(-2)}</b></li>)}</ol>
   <div className="activity-total"><strong>{activity.completed}</strong><span>completed in total</span></div>
  </section>}
  <section aria-labelledby="collections-title"><div className="library-section-heading"><h2 id="collections-title">Collections</h2><span>{courses.length}</span>{(courses.length>1||ordering)&&<button className="order-toggle" aria-pressed={ordering} onClick={()=>{setOrdering(!ordering);onQuery('');setStatus('all')}}><SlidersHorizontal size={16}/>{ordering?'Done':'Order'}</button>}</div>
   {courses.length>0&&!ordering&&<div className="collection-filters" role="group" aria-label="Collection status">{([['all','All'],['active','In progress'],['completed','Completed']] as const).map(([value,label])=><button key={value} aria-pressed={status===value} onClick={()=>setStatus(value)}>{label}</button>)} </div>}
   {ordering?<div className="library-order"><p>Drag by ⋮⋮. With the keyboard, use ↑ ↓.</p><CollectionList courses={courses} active={active} onPick={onPick} onDelete={onDelete} onRename={onRename} onReorder={onReorder}/></div>:
   filtered.length?<div className="course-grid">{filtered.map(course=>{
    const completed=course.lessons.filter(l=>!!l.completedAt).length;
    return <article className="course-tile" key={course.id}>
     <div className="course-tile-top"><span className="course-glyph"><BookOpen size={21}/></span><details className="course-menu"><summary aria-label={`Actions for collection ${course.title}`}><MoreHorizontal size={20}/></summary><div className="course-menu-items"><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setName(course.title);setEditing(course.id)}}><Pencil size={15}/>Rename</button><button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onDelete(course.id)}}><Trash2 size={15}/>Delete</button></div></details></div>
     {editing===course.id?<form className="tile-rename" onSubmit={e=>{e.preventDefault();rename(course.id)}}><input aria-label="Collection name" value={name} maxLength={120} onChange={e=>setName(e.target.value)} autoFocus onFocus={e=>e.currentTarget.select()} onKeyDown={e=>{if(e.key==='Escape')setEditing(null)}}/><div><button className="icon-button" disabled={!name.trim()} aria-label="Save name"><Check size={17}/></button><button className="icon-button" type="button" onClick={()=>setEditing(null)} aria-label="Cancel"><X size={17}/></button></div></form>:<button className="course-tile-open" onClick={()=>onPick(course.id)}><h3>{course.title}</h3>{course.source&&!sameLabel(course.source,course.title)&&<span className="tile-source">{course.source}</span>}<span className="tile-progress" aria-hidden="true"><span style={{width:`${course.lessons.length?100*completed/course.lessons.length:0}%`}}/></span><span className="tile-bottom"><span>{course.lessons.length?`${completed} / ${course.lessons.length} completed`:'No items'}</span>{course.lessons.length>0&&completed===course.lessons.length?<Check size={17}/>:<ArrowRight size={17}/>}</span></button>}
    </article>;
   })}</div>:query.trim()||status!=='all'?<div className="library-empty"><Search size={26}/><h3>Nothing found</h3><button className="button secondary" onClick={()=>{onQuery('');setStatus('all')}}>Show all</button></div>:<div className="library-empty"><BookOpen size={30}/><h3>Any course, one day at a time</h3><p>Add a link. Mark completed items and save notes.</p><button className="button primary" onClick={onAdd}><Plus size={17}/>Add links</button></div>}
  </section>
 </div>;
}
