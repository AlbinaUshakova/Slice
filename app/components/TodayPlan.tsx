'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,ArrowRight,Check,BookOpen,Pencil,Plus,RotateCcw,X} from 'lucide-react';
import {courseDuration,courseHasStarted,localDay,type Course} from '@/lib/course';
import {todayItems} from '@/lib/today';
import SourceArtwork from './SourceArtwork';
export default function TodayPlan({courses,onToggle,onLesson,onRename,onAdd,onHome,onOpened}:{courses:Course[];onToggle:(courseId:string,lessonId:string)=>void;onLesson:(courseId:string,lessonId:string)=>void;onRename:(courseId:string,lessonId:string,title:string)=>void;onAdd:()=>void;onHome:()=>void;onOpened?:(courseId:string,lessonId:string)=>void}){
 const [now,setNow]=useState(()=>new Date());
 const [editing,setEditing]=useState<{courseId:string;lessonId:string}|null>(null);
 const [title,setTitle]=useState('');
 useEffect(()=>{const refresh=()=>setNow(new Date());const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}},[]);
 const items=todayItems(courses,now),done=items.filter(item=>item.done).length,waiting=courses.filter(course=>course.lessons.some(lesson=>!lesson.completedAt)&&!courseHasStarted(course,localDay(now))).length;
 function startEditing(courseId:string,lessonId:string,currentTitle:string){setEditing({courseId,lessonId});setTitle(currentTitle)}
 function cancelEditing(){setEditing(null);setTitle('')}
 function saveTitle(courseId:string,lessonId:string){const next=title.trim().slice(0,200);if(!next)return;onRename(courseId,lessonId,next);cancelEditing()}
 const pending=items.filter(item=>!item.done),completed=items.filter(item=>item.done);
 return <div className="today-home minimal-today">
  <div className="today-heading"><div><h1>Today</h1><span className="today-date">{new Intl.DateTimeFormat('en',{day:'numeric',month:'long',weekday:'long'}).format(now)}</span></div>{items.length>0&&<span className="today-count" role="status">{done} of {items.length}<small>lessons today</small></span>}</div>
  {pending.length?<div className="today-list">{pending.map(({course,lesson,done,day})=>{const isEditing=editing?.courseId===course.id&&editing.lessonId===lesson.id;return <article key={`${course.id}:${lesson.id}`} className="today-card">
   <div className="today-card-top"><button className="today-course" onClick={()=>onLesson(course.id,lesson.id)}>{course.title}</button><div className="today-card-meta"><span>DAY {day} OF {courseDuration(course.lessons.length,course.pace)}</span><button className="icon-button today-rename-trigger" onClick={()=>startEditing(course.id,lesson.id,lesson.title)} aria-label={`Edit lesson title: ${lesson.title}`}><Pencil size={15}/></button></div></div>
   {isEditing?<form className="today-rename-form" onSubmit={event=>{event.preventDefault();saveTitle(course.id,lesson.id)}}><input aria-label={`Lesson title for ${course.title}`} value={title} onChange={event=>setTitle(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();cancelEditing()}}} onFocus={event=>event.currentTarget.select()} maxLength={200} autoFocus/><button className="button primary" disabled={!title.trim()}><Check size={15}/>Save</button><button type="button" className="icon-button" onClick={cancelEditing} aria-label="Cancel editing"><X size={17}/></button></form>:<h2>{lesson.title}</h2>}
   <SourceArtwork lessonUrl={lesson.url} sourceUrl={course.sourceUrl} source={course.source} compact/>
   <div className="today-actions"><a className="button primary" href={lesson.url} target="_blank" rel="noopener noreferrer" onClick={()=>onOpened?.(course.id,lesson.id)}>Open<ArrowUpRight size={16}/></a><button className="button secondary" onClick={()=>{setNow(new Date());onToggle(course.id,lesson.id)}} aria-label={`Done: ${lesson.title}`} aria-pressed={done}><Check size={17}/>Done</button><button className="today-notes" onClick={()=>onLesson(course.id,lesson.id)}>Note & audio<ArrowRight size={14}/></button></div>
  </article>})}</div>:items.length>0&&<section className="today-complete-state"><Check size={26}/><h2>That’s all for today</h2><p>New lessons will appear tomorrow. You can also continue with the next lesson now.</p></section>}
  {completed.length>0&&<section className="completed-today"><div className="completed-heading"><h2>Done today</h2><span>{completed.length}</span></div>{completed.map(({course,lesson,day})=><div className="completed-row" key={`${course.id}:${lesson.id}`}><span className="completed-check"><Check size={15}/></span><button onClick={()=>onLesson(course.id,lesson.id)}><small>{course.title}</small><b>{lesson.title}</b></button><span>{day}</span><button className="button secondary" onClick={()=>onToggle(course.id,lesson.id)}><RotateCcw size={14}/>Undo</button></div>)}</section>}
  {!items.length&&<section className="first-run-card today-empty"><BookOpen size={28}/><h2>{courses.length?'Nothing scheduled today':'Start with one link'}</h2><p>{courses.length?(waiting?`${waiting} ${waiting===1?'collection is':'collections are'} waiting for the selected start date.`:'Your next lesson is waiting in Collections.'):'Turn a playlist, podcast, course, or article into a day-by-day plan.'}</p><button className="button primary" onClick={courses.length?onHome:onAdd}>{courses.length?'View collections':<><Plus size={17}/>Add link</>}</button></section>}
 </div>;
}
