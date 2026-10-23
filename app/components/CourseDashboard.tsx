'use client';
import {useState} from 'react';
import {ArrowRight,Check,MoreHorizontal,Pencil,Plus,Trash2,X} from 'lucide-react';
import {nextLesson,type Course} from '@/lib/course';

const host=(value:string)=>{try{return new URL(value).hostname.replace(/^www\./,'')}catch{return ''}};
const duration=(course:Course)=>course.lessons.length?`≈ ${Math.max(1,Math.round(course.lessons.length*9/6)/10)} hr`:'';

export default function CourseDashboard({courses,onPick,onAdd,onDelete,onRename}:{courses:Course[];active:string;onPick:(id:string)=>void;onAdd:()=>void;onDelete:(id:string)=>void;onRename:(id:string,title:string)=>void;onReorder:(id:string,target:string)=>void;query:string;onQuery:(query:string)=>void}){
 const [editing,setEditing]=useState<string|null>(null),[name,setName]=useState('');
 function rename(id:string){if(!name.trim())return;onRename(id,name.trim().slice(0,120));setEditing(null)}
 return <div className="collections-page">
  <div className="collections-page-heading"><h1>My collections</h1><button className="button primary" onClick={onAdd}><Plus size={17}/>Add link</button></div>
  {courses.length?<div className="minimal-course-list">{courses.map(course=>{const completed=course.lessons.filter(lesson=>!!lesson.completedAt).length;const next=nextLesson(course);return <article className="minimal-course-card" key={course.id}>
   <div className="minimal-course-card-head"><div><h2>{course.title}</h2><span>{host(course.sourceUrl)||course.source}</span></div><details className="course-menu"><summary aria-label={`Actions for ${course.title}`}><MoreHorizontal size={20}/></summary><div className="course-menu-items"><button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');setName(course.title);setEditing(course.id)}}><Pencil size={15}/>Rename</button><button onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');onDelete(course.id)}}><Trash2 size={15}/>Delete</button></div></details></div>
   {editing===course.id?<form className="collection-inline-rename" onSubmit={event=>{event.preventDefault();rename(course.id)}}><input value={name} onChange={event=>setName(event.target.value)} aria-label="Collection name" autoFocus maxLength={120}/><button className="icon-button" aria-label="Save"><Check size={17}/></button><button className="icon-button" type="button" onClick={()=>setEditing(null)} aria-label="Cancel"><X size={17}/></button></form>:<>
    <p className="minimal-course-meta">{course.lessons.length} lessons{duration(course)&&` · ${duration(course)}`}</p>
    <div className="minimal-course-progress"><div className="progress-track" role="progressbar" aria-label="Collection progress" aria-valuemin={0} aria-valuemax={course.lessons.length} aria-valuenow={completed}><span style={{width:`${course.lessons.length?100*completed/course.lessons.length:0}%`}}/></div><span>{completed?`${completed} of ${course.lessons.length}`:'Not started'}</span></div>
    <div className="minimal-course-next"><span>{next?completed?`Next: ${next.title}`:`Day 1 · ${next.title}`:'Collection complete'}</span><button className="button secondary" onClick={()=>onPick(course.id)}>{next?completed?'Continue':'Start':'Open'}<ArrowRight size={15}/></button></div>
   </>}
  </article>})}<button className="minimal-add-card" onClick={onAdd}><Plus size={20}/>Add link</button></div>:<section className="first-run-card"><span className="first-run-kicker">START WITH A LINK</span><h2>Paste a link. Get a day-by-day plan.</h2><p>We’ll turn a playlist, podcast, course or article into daily lessons and keep your progress in this browser.</p><button className="button primary" onClick={onAdd}>Build a plan<ArrowRight size={17}/></button><div className="first-run-types"><span>YouTube playlist</span><span>Podcast</span><span>Course site</span><span>Article</span></div><ol><li><b>Paste a link</b><span>A playlist, podcast, or page with lessons.</span></li><li><b>Choose your pace</b><span>One a day, two a day, or weekdays only.</span></li><li><b>Learn day by day</b><span>Mark lessons done and keep your notes.</span></li></ol><small>No sign-up. Just paste a link.</small></section>}
 </div>;
}
