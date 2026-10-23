'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,ArrowRight,Check,BookOpen,Pencil,Plus,RotateCcw,X} from 'lucide-react';
import type {Course} from '@/lib/course';
import {todayItems} from '@/lib/today';
import SourceArtwork from './SourceArtwork';
export default function TodayPlan({courses,onToggle,onLesson,onRename,onAdd,onHome}:{courses:Course[];onToggle:(courseId:string,lessonId:string)=>void;onLesson:(courseId:string,lessonId:string)=>void;onRename:(courseId:string,lessonId:string,title:string)=>void;onAdd:()=>void;onHome:()=>void}){
 const [now,setNow]=useState(()=>new Date());
 const [editing,setEditing]=useState<{courseId:string;lessonId:string}|null>(null);
 const [title,setTitle]=useState('');
 useEffect(()=>{const refresh=()=>setNow(new Date());const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}},[]);
 const items=todayItems(courses,now),done=items.filter(item=>item.done).length;
 function startEditing(courseId:string,lessonId:string,currentTitle:string){setEditing({courseId,lessonId});setTitle(currentTitle)}
 function cancelEditing(){setEditing(null);setTitle('')}
 function saveTitle(courseId:string,lessonId:string){const next=title.trim().slice(0,200);if(!next)return;onRename(courseId,lessonId,next);cancelEditing()}
 return <div className="today-home">
  <div className="today-heading"><div><span className="home-eyebrow">{new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',weekday:'long'}).format(now)}</span><h1>Сегодня</h1></div>{items.length>0&&<span className="today-count" role="status">{done} / {items.length} готово</span>}</div>
  {items.length>0?<><p className="today-hint">По одному материалу из каждой подборки.</p>{done===items.length&&<div className="today-finished" role="status"><Check size={19}/><span>На сегодня всё. До завтра!</span></div>}<div className="today-list">{items.map(({course,lesson,done,day})=>{const isEditing=editing?.courseId===course.id&&editing.lessonId===lesson.id;return <article key={course.id} className={'today-card '+(done?'is-complete':'')}>
   <div className="today-card-top"><button className="today-course" onClick={()=>onLesson(course.id,lesson.id)}>{course.title}<ArrowRight size={14}/></button><div className="today-card-meta"><span>День {day}</span><button className="icon-button today-rename-trigger" onClick={()=>startEditing(course.id,lesson.id,lesson.title)} aria-label={`Изменить название темы: ${lesson.title}`} title="Изменить название темы"><Pencil size={15}/></button></div></div>
   {isEditing&&<form className="today-rename-form" onSubmit={event=>{event.preventDefault();saveTitle(course.id,lesson.id)}}><input aria-label={`Название темы для ${course.title}`} value={title} onChange={event=>setTitle(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();cancelEditing()}}} onFocus={event=>event.currentTarget.select()} maxLength={200} autoFocus/><button className="button primary" disabled={!title.trim()}><Check size={15}/>Сохранить</button><button type="button" className="icon-button" onClick={cancelEditing} aria-label="Отменить редактирование" title="Отменить"><X size={17}/></button></form>}
   <SourceArtwork lessonUrl={lesson.url} sourceUrl={course.sourceUrl} source={course.source} compact/>
   <div className="today-actions"><a className="button primary" href={lesson.url} target="_blank" rel="noopener noreferrer">Открыть<ArrowUpRight size={16}/></a><button className={'button secondary '+(done?'is-done':'')} onClick={()=>{setNow(new Date());onToggle(course.id,lesson.id)}} aria-label={done?`Снять отметку: ${lesson.title}`:`Готово: ${lesson.title}`} aria-pressed={done}>{done?<RotateCcw size={15}/>:<Check size={17}/>}<span>{done?'Выполнено':'Готово'}</span></button><button className="today-notes" onClick={()=>onLesson(course.id,lesson.id)}>Заметки<ArrowRight size={14}/></button></div>
  </article>})}</div></>:<section className="library-empty"><BookOpen size={30}/><h3>{courses.length?'На сегодня нет материалов':'Начни с одной ссылки'}</h3><p>{courses.length?'Все материалы пройдены или дата начала ещё впереди.':'Курс, видео или статьи — по одному в день.'}</p><button className="button primary" onClick={courses.length?onHome:onAdd}>{courses.length?'К подборкам':<><Plus size={17}/>Добавить ссылки</>}</button></section>}
 </div>;
}
