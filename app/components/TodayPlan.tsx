'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,ArrowRight,Check,BookOpen,Plus,RotateCcw} from 'lucide-react';
import type {Course} from '@/lib/course';
import {todayItems} from '@/lib/today';
import SourceArtwork from './SourceArtwork';
export default function TodayPlan({courses,onToggle,onLesson,onAdd,onHome}:{courses:Course[];onToggle:(courseId:string,lessonId:string)=>void;onLesson:(courseId:string,lessonId:string)=>void;onAdd:()=>void;onHome:()=>void}){
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{const refresh=()=>setNow(new Date());const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}},[]);
 const items=todayItems(courses,now),done=items.filter(item=>item.done).length;
 return <div className="today-home">
  <div className="today-heading"><div><span className="home-eyebrow">{new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',weekday:'long'}).format(now)}</span><h1>Сегодня</h1></div>{items.length>0&&<span className="today-count" role="status">{done} / {items.length} готово</span>}</div>
  {items.length>0?<><p className="today-hint">По одному материалу из каждой подборки.</p>{done===items.length&&<div className="today-finished" role="status"><Check size={19}/><span>На сегодня всё. До завтра!</span></div>}<div className="today-list">{items.map(({course,lesson,done,day})=><article key={course.id} className={'today-card '+(done?'is-complete':'')}>
   <div className="today-card-top"><button className="today-course" onClick={()=>onLesson(course.id,lesson.id)}>{course.title}<ArrowRight size={14}/></button><span>День {day}</span></div>
   <SourceArtwork lessonUrl={lesson.url} sourceUrl={course.sourceUrl} source={course.source} compact/>
   <div className="today-actions"><a className="button primary" href={lesson.url} target="_blank" rel="noopener noreferrer">Открыть<ArrowUpRight size={16}/></a><button className={'button secondary '+(done?'is-done':'')} onClick={()=>{setNow(new Date());onToggle(course.id,lesson.id)}} aria-label={done?`Снять отметку: ${lesson.title}`:`Готово: ${lesson.title}`} aria-pressed={done}>{done?<RotateCcw size={15}/>:<Check size={17}/>}<span>{done?'Выполнено':'Готово'}</span></button><button className="today-notes" onClick={()=>onLesson(course.id,lesson.id)}>Заметки<ArrowRight size={14}/></button></div>
  </article>)}</div></>:<section className="library-empty"><BookOpen size={30}/><h3>{courses.length?'На сегодня нет материалов':'Начни с одной ссылки'}</h3><p>{courses.length?'Все материалы пройдены или дата начала ещё впереди.':'Курс, видео или статьи — по одному в день.'}</p><button className="button primary" onClick={courses.length?onHome:onAdd}>{courses.length?'К подборкам':<><Plus size={17}/>Добавить ссылки</>}</button></section>}
 </div>;
}
