'use client';
import {useRef,useState} from 'react';
import {GripVertical,Trash2,Pencil,Check,X} from 'lucide-react';
import type {Course} from '@/lib/course';
export default function CollectionList({courses,active,onPick,onDelete,onReorder,onRename}:{courses:Course[];active:string;onPick:(id:string)=>void;onDelete:(id:string)=>void;onReorder:(id:string,target:string)=>void;onRename:(id:string,title:string)=>void}){
 const list=useRef<HTMLDivElement>(null);
 const drag=useRef<{id:string;target:string;pointer:number}|null>(null);
 const [visual,setVisual]=useState<{id:string;target:string}|null>(null);
 const [message,setMessage]=useState('');
 const [editing,setEditing]=useState<string|null>(null);
 const [name,setName]=useState('');
 function saveName(id:string){const title=name.trim();if(!title)return;onRename(id,title);setEditing(null);setMessage('Название сохранено.')}

 function end(commit:boolean){const current=drag.current;if(commit&&current){onReorder(current.id,current.target);setMessage('Порядок подборок сохранён.')}drag.current=null;setVisual(null)}
 return <div className="collections" ref={list}>
  <span className="sr-only" role="status">{message}</span>
  {courses.map((c,index)=><div key={c.id} data-course-id={c.id} className={'collection-row '+(c.id===active?'chosen ':'')+(visual?.id===c.id?'dragging ':'')+(visual?.target===c.id&&visual.id!==c.id?'drop-target':'')}>
   <button className="icon-button drag-handle" disabled={courses.length<2} aria-label={`Переместить ${c.title}`} title="Перетащи или используй ↑ ↓" onKeyDown={e=>{
    if(e.key==='Escape'){end(false);return}
    if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const target=courses[index+(e.key==='ArrowUp'?-1:1)];if(target){onReorder(c.id,target.id);setMessage(`${c.title}: позиция ${index+(e.key==='ArrowUp'?0:2)}`)}
   }} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:c.id,target:c.id,pointer:e.pointerId};setVisual({id:c.id,target:c.id})}} onPointerMove={e=>{
    if(!drag.current||drag.current.pointer!==e.pointerId)return;
    const box=list.current?.getBoundingClientRect();if(box&&list.current){if(e.clientY<box.top+30)list.current.scrollTop-=12;else if(e.clientY>box.bottom-30)list.current.scrollTop+=12}
    const row=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-course-id]');
    if(row&&list.current?.contains(row)){const target=row.dataset.courseId!;drag.current.target=target;setVisual({id:c.id,target})}
   }} onPointerUp={()=>end(true)} onPointerCancel={()=>end(false)} onLostPointerCapture={()=>end(false)}><GripVertical size={15}/></button>
   {editing===c.id?<form className="collection-rename" onSubmit={e=>{e.preventDefault();saveName(c.id)}}><input aria-label="Название подборки" value={name} maxLength={120} autoFocus onFocus={e=>e.currentTarget.select()} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setEditing(null)}}}/><button className="icon-button" disabled={!name.trim()} aria-label="Сохранить название"><Check size={14}/></button><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="Отменить переименование"><X size={14}/></button></form>:<><button className="collection-pick" onClick={()=>onPick(c.id)} title={c.title}><span>{c.title}</span></button>
   <button className="icon-button rename-collection" aria-label={`Переименовать подборку ${c.title}`} title="Переименовать" onClick={()=>{setEditing(c.id);setName(c.title)}}><Pencil size={13}/></button>
   <button className="icon-button delete-collection" aria-label={`Удалить подборку ${c.title}`} onClick={()=>onDelete(c.id)}><Trash2 size={14}/></button></>}
  </div>)}
 </div>;
}
