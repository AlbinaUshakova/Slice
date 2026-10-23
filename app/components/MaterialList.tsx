'use client';
import {useRef,useState} from 'react';
import {GripVertical,Pencil,Trash2,Check,X,ChevronRight} from 'lucide-react';
import {plannedDay,type Course} from '@/lib/course';
const dateLabel=(value:string)=>new Intl.DateTimeFormat('en',{day:'numeric',month:'short'}).format(new Date(value+'T12:00:00'));
export default function MaterialList({course,start,count,onPick,onRename,onDelete,onReorder}:{
 course:Course;start:number;count:number;onPick:(id:string)=>void;onRename:(id:string,title:string)=>void;onDelete:(id:string)=>void;onReorder:(id:string,target:string)=>void;
}){
 const list=useRef<HTMLDivElement>(null);
 const drag=useRef<{id:string;target:string;pointer:number}|null>(null);
 const [visual,setVisual]=useState<{id:string;target:string}|null>(null);
 const [editing,setEditing]=useState<string|null>(null),[name,setName]=useState(''),[message,setMessage]=useState('');
 function save(id:string){if(!name.trim())return;onRename(id,name);setEditing(null);setMessage('Name saved.');}
 function end(commit:boolean){const current=drag.current;drag.current=null;setVisual(null);if(commit&&current&&current.id!==current.target){onReorder(current.id,current.target);setMessage('Order saved.');}}
 return <div className="material-list" ref={list} role="list" aria-label="Collection items">
  <span className="sr-only" role="status">{message}</span>
  {course.lessons.slice(start,start+count).map((lesson,j)=>{
   const i=start+j,date=plannedDay(course.planStart,i),targeted=visual?.target===lesson.id&&visual.id!==lesson.id;
   const direction=visual&&course.lessons.findIndex(l=>l.id===visual.id)>i?'drop-before':'drop-after';
   return <div key={lesson.id} data-lesson-id={lesson.id} role="listitem" className={'material-row '+(visual?.id===lesson.id?'dragging ':'')+(targeted?direction:'')}>
    <button className="icon-button drag-handle" disabled={course.lessons.length<2||editing!==null} aria-label={`Move ${lesson.title}`} title="Drag or use ↑ ↓" onKeyDown={e=>{
     if(e.key==='Escape'){end(false);return}
     if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const target=course.lessons[i+(e.key==='ArrowUp'?-1:1)];
     if(target){onReorder(lesson.id,target.id);setMessage(`${lesson.title}: day ${i+(e.key==='ArrowUp'?0:2)}`);}
    }} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:lesson.id,target:lesson.id,pointer:e.pointerId};setVisual({id:lesson.id,target:lesson.id})}} onPointerMove={e=>{
     if(!drag.current||drag.current.pointer!==e.pointerId)return;
     if(e.clientY<110)window.scrollBy(0,-16);else if(e.clientY>window.innerHeight-110)window.scrollBy(0,16);
     const row=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-lesson-id]');
     const target=row&&list.current?.contains(row)?row.dataset.lessonId!:lesson.id;
     drag.current.target=target;setVisual({id:lesson.id,target});
    }} onPointerUp={()=>end(true)} onPointerCancel={()=>end(false)} onLostPointerCapture={()=>end(false)}><GripVertical size={17}/></button>
    <span className="material-day">Day {i+1}{date&&<small>{dateLabel(date)}</small>}</span>
    {editing===lesson.id?<form className="material-rename" onSubmit={e=>{e.preventDefault();save(lesson.id)}}>
     <input aria-label="Item name" value={name} onChange={e=>setName(e.target.value)} autoFocus onFocus={e=>e.currentTarget.select()} maxLength={200} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setEditing(null)}}}/>
     <button className="icon-button" disabled={!name.trim()} aria-label="Save name" title="Save"><Check size={17}/></button>
     <button className="icon-button" type="button" onClick={()=>setEditing(null)} aria-label="Cancel renaming" title="Cancel"><X size={17}/></button>
    </form>:<>
     <button className="material-pick" onClick={()=>onPick(lesson.id)} aria-label={`Day ${i+1}: ${lesson.title}${lesson.completedAt?', completed':''}`}>
      <span className="history-copy"><b>{lesson.title}</b>{lesson.group&&<small>{lesson.group}</small>}{lesson.note&&<span className="note-preview">{lesson.note}</span>}</span>
      {lesson.completedAt?<Check className="history-check" size={17}/>:<ChevronRight size={17}/>}
     </button>
     <div className="material-controls">
      <button className="icon-button" title="Rename" aria-label={`Rename ${lesson.title}`} onClick={()=>{setName(lesson.title);setEditing(lesson.id)}}><Pencil size={16}/></button>
      <button className="icon-button" title="Delete" aria-label={`Delete ${lesson.title}`} onClick={()=>onDelete(lesson.id)}><Trash2 size={16}/></button>
     </div>
    </>}
   </div>;
  })}
 </div>;
}
