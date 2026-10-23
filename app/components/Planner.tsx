'use client';

import {useEffect,useRef,useState} from 'react';
import CollectionList from './CollectionList';
import CourseDashboard from './CourseDashboard';
import TodayPlan from './TodayPlan';
import BackupDialog from './BackupDialog';
import MaterialList from './MaterialList';
import {renameMaterial,removeMaterial,reorderMaterials} from '@/lib/materials';
import AppTools from './AppTools';
import AppHeader from './AppHeader';
import VoiceNote from './VoiceNote';
import SourceArtwork from './SourceArtwork';
import {deleteCourseRecordings,deleteLessonRecordings} from '@/lib/recordings';
import {planCourseId} from '@/lib/navigation';
import {parseLinkInput} from '@/lib/link-input';
import {appendCourse,newLessons} from '@/lib/append-course';
import {ArrowUpRight,ArrowRight,ArrowUp,ArrowDown,Check,Plus,X,BookOpen,RotateCcw,Download,List,House,Link2,ChevronDown,Flag,AlertCircle,Pencil} from 'lucide-react';
import {Course,CoursePace,Lesson,STORAGE_KEY,ACTIVE_KEY,nextLesson,completeLesson,mergeCourse,validCourses,localDay,plannedDay,planDayNumber,removeCourse,reorderCourses,paceLabel,courseDuration} from '@/lib/course';

const pad=(n:number)=>String(n).padStart(2,'0');
const sameLabel=(first:string,second:string)=>first.trim().toLocaleLowerCase('en')===second.trim().toLocaleLowerCase('en');
const dateLabel=(value:string)=>new Intl.DateTimeFormat('en',{day:'numeric',month:'short'}).format(new Date(value.length===10?value+'T12:00:00':value));
const PAGE_SIZE=50;
function Pager({page,count,onChange}:{page:number;count:number;onChange:(page:number)=>void}){return count>PAGE_SIZE?<div className="plan-pager"><button className="icon-button" disabled={page===0} onClick={()=>onChange(page-1)} aria-label="Previous items"><ArrowUp size={15}/></button><span>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,count)} / {count}</span><button className="icon-button" disabled={(page+1)*PAGE_SIZE>=count} onClick={()=>onChange(page+1)} aria-label="Next items"><ArrowDown size={15}/></button></div>:null}
const EMPTY:Course={id:'',title:'Collections',source:'',sourceUrl:'',lessons:[]};
const EMPTY_LESSON:Lesson={id:'',title:'',url:'',note:'',completedAt:null};

function ImportDialog({onClose,onSave,target,existingIds}:{onClose:()=>void;onSave:(course:Course)=>void;target?:Course;existingIds:string[]}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const [input,setInput]=useState('');
 const [title,setTitle]=useState('');
 const [draftPage,setDraftPage]=useState(0);
 const [draft,setDraft]=useState<Course|null>(null);
 const [levels,setLevels]=useState<string[]>([]);
 const [start,setStart]=useState(localDay());
 const [startMode,setStartMode]=useState<'today'|'tomorrow'|'custom'>('today');
 const [pace,setPace]=useState<CoursePace>('daily');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close()},[]);
 const groups=[...new Set(draft?.lessons.map(l=>l.group).filter((g):g is string=>!!g))];
 const limitReached=!target&&existingIds.length>=30&&!!draft&&!existingIds.includes(draft.id);
 const reviewed=draft?.lessons.filter(l=>!l.group||levels.includes(l.group))??[];
 const reviewPage=Math.min(draftPage,Math.max(0,Math.ceil(reviewed.length/PAGE_SIZE)-1));
 function review(course:Course){if(target)course={...course,lessons:newLessons(target,course.lessons)};if(title.trim())course={...course,title:title.trim().slice(0,120)};setDraftPage(0);setDraft(course);setLevels([...new Set(course.lessons.map(l=>l.group).filter((g):g is string=>!!g))]);}
 async function find() {
  setError('');setBusy(true);
  try {
   const {lessons,discover}=parseLinkInput(input);
   if(discover) {
    const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:lessons[0].url})});
    const data:unknown=await response.json();
    if(!response.ok)throw new Error(data&&typeof data==='object'&&'error' in data?String(data.error):'Couldn’t load the list.');
    const candidate=[data];
    if(!validCourses(candidate)||!candidate[0].lessons.length)throw new Error('Couldn’t recognize the list. Paste item links on separate lines.');
    review(candidate[0]);
   } else {
    review({id:crypto.randomUUID(),title:'My collection',source:'My collection',sourceUrl:lessons[0].url,lessons});
   }
  } catch(e) {setError(e instanceof Error?e.message:'Couldn’t load the list. Try again.')}
  finally {setBusy(false)}
 }
 function chooseStart(mode:'today'|'tomorrow'|'custom'){
  setStartMode(mode);if(mode==='today')setStart(localDay());if(mode==='tomorrow'){const date=new Date();date.setDate(date.getDate()+1);setStart(localDay(date))}
 }
 function splitManually(){
  let url='';try{url=parseLinkInput(input).lessons[0]?.url??''}catch{url=input.trim().split(/\s+/).find(value=>{try{return /^https?:$/.test(new URL(value).protocol)}catch{return false}})??''}
  if(!url){setError('Paste the link first, then choose the number of days.');return}
  const answer=window.prompt('How many days should this material take?','7');const count=Number(answer);if(!Number.isInteger(count)||count<1||count>365)return;
  review({id:crypto.randomUUID(),title:title.trim()||'My collection',source:'Manual split',sourceUrl:url,lessons:Array.from({length:count},(_,index)=>({id:`${url}#day-${index+1}`,title:`Day ${index+1}`,url,note:'',completedAt:null}))});setError('');
 }
 function move(id:string,by:number) {
  if(!draft)return;
  const position=reviewed.findIndex(l=>l.id===id);const target=reviewed[position+by];
  if(!target)return;
  const arr=[...draft.lessons];const a=arr.findIndex(l=>l.id===id);const b=arr.findIndex(l=>l.id===target.id);
  [arr[a],arr[b]]=[arr[b],arr[a]];setDraft({...draft,lessons:arr});
 }
 const duration=courseDuration(reviewed.length,pace),finish=reviewed.length?plannedDay(start,reviewed.length-1,pace):null;
 const host=(()=>{try{return new URL(draft?.sourceUrl??'').hostname.replace(/^www\./,'')}catch{return ''}})();
 const recognized=draft?(host.includes('youtube')?`YouTube playlist: ${reviewed.length} videos → ${reviewed.length} lessons`:host.includes('spotify')?`Spotify show: ${reviewed.length} episodes → ${reviewed.length} lessons`:`Found ${reviewed.length} ${reviewed.length===1?'lesson':'lessons'}`):'';
 return <dialog ref={dialog} className="import-dialog minimal-import" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="dialog-heading"><h2>{target?'Add links':'New collection'}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={23}/></button></div>
  {target&&<p className="append-target">{target.title}</p>}
  {!draft?<>
   <form className="import-entry" onSubmit={e=>{e.preventDefault();void find()}}>
    {!target&&<><label htmlFor="collection-title">TITLE <small>optional</small></label><input id="collection-title" value={title} onChange={event=>setTitle(event.target.value)} maxLength={120} placeholder="My collection"/></>}
    <label htmlFor="material-links">LINKS</label>
    <div className="link-input-wrap"><Link2 size={20}/><textarea id="material-links" className="link-input" rows={4} value={input} disabled={busy} onChange={e=>{setInput(e.target.value);if(error)setError('')}} placeholder={'https://…\nhttps://…'} required maxLength={420000} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="links-hint"/></div>
    <p id="links-hint" className="field-hint">Put each link on a new line.</p>
    {!error&&<div className="import-explain"><div><b>Several links</b><span>Each becomes its own lesson.</span></div><div><b>One link</b><span>We’ll split a playlist, course, podcast, or article into lessons.</span></div></div>}
    {error&&<div className="import-fallback" role="alert"><div className="fallback-title"><AlertCircle size={20}/><div><b>We couldn’t read this link</b><span>{error}</span></div></div><p>What you can do</p><button type="button" onClick={()=>{setError('');document.getElementById('material-links')?.focus()}}><b>Paste text or a list of parts</b><span>Copy the contents or lesson list and put one item on each line.</span></button><button type="button" onClick={splitManually}><b>Split it into equal parts</b><span>Choose a number of days. The link will stay the same.</span></button><button type="button" onClick={()=>{setInput('');setError('');document.getElementById('material-links')?.focus()}}><b>Try another link</b><span>A direct playlist, episode, or course page usually works best.</span></button></div>}
    <div className="import-examples"><span>Try an example:</span><button disabled={busy} type="button" onClick={()=>setInput('https://naked-science.ru/tags/kosmos')}>Space</button><button disabled={busy} type="button" onClick={()=>setInput('https://aferin.me/program')}>Turkish</button><button disabled={busy} type="button" onClick={()=>setInput('https://www.youtube.com/playlist?list=PLssRXZAfmWU510niYlySaZnOLHwj2jTUP')}>YouTube</button></div>
    <details className="import-help"><summary>Supported sources and tips <ChevronDown size={16}/></summary><p>YouTube playlists, Stepik courses, podcast RSS/Atom feeds, and public articles. For Telegram, paste links from a public or pinned post.</p></details>
    <button className="button primary wide" disabled={busy}>{busy?'Finding lessons…':target?'Continue':'Build plan'}{!busy&&<ArrowRight size={16}/>}</button>
   </form>
  </>:<>
   <div className="recognized-source"><div><Link2 size={20}/><span>{draft.sourceUrl}</span></div><p role="status"><Check size={16}/>{draft.importNotice||recognized}</p></div>
   {!target&&title.trim()&&<input className="review-title" aria-label="Collection title" value={draft.title} maxLength={120} onChange={e=>setDraft({...draft,title:e.target.value})}/>}
   {groups.length>0&&<fieldset className="level-select"><legend>{groups.every(g=>/^[ABC][12]$/.test(g))?'Levels':'Sections'}</legend>{groups.map(group=><label key={group}><input type="checkbox" checked={levels.includes(group)} onChange={()=>setLevels(prev=>prev.includes(group)?prev.filter(g=>g!==group):[...prev,group])}/><span>{group}</span></label>)}</fieldset>}
   {!target&&<><div className="schedule-field"><span>Pace</span><div className="segmented-control">{([['daily','1 a day'],['twice-daily','2 a day'],['weekdays','Weekdays']] as const).map(([value,label])=><button type="button" className={pace===value?'active':''} onClick={()=>setPace(value)} key={value}>{label}</button>)}</div></div><div className="schedule-field"><span>Start</span><div className="segmented-control"><button type="button" className={startMode==='today'?'active':''} onClick={()=>chooseStart('today')}>Today</button><button type="button" className={startMode==='tomorrow'?'active':''} onClick={()=>chooseStart('tomorrow')}>Tomorrow</button><button type="button" className={startMode==='custom'?'active':''} onClick={()=>chooseStart('custom')}>Choose date</button></div>{startMode==='custom'&&<input className="custom-date" aria-label="Start date" type="date" value={start} onChange={event=>setStart(event.target.value)} required/>}</div></>}
   <div className="plan-summary"><strong>{target?`Starts at lesson ${target.lessons.length+1}`:`${duration} ${duration===1?'day':'days'} · finishes ${finish?new Intl.DateTimeFormat('en',{weekday:'short',day:'numeric',month:'short'}).format(new Date(finish+'T12:00:00')):'—'}`}</strong><div className="plan-dots" aria-hidden="true">{Array.from({length:Math.min(20,Math.max(1,duration))},(_,index)=><span className={index===0?'active':''} key={index}/>)}<Flag size={20}/></div><span>{pace==='twice-daily'?'Two lessons each day.':pace==='weekdays'?'One lesson each weekday.':'One lesson each day.'}</span></div>
   <details className="parts-review"><summary>Show and edit lessons ({reviewed.length}) <ChevronDown size={17}/></summary><Pager page={reviewPage} count={reviewed.length} onChange={setDraftPage}/><div className="draft-list" key={reviewPage}>{reviewed.slice(reviewPage*PAGE_SIZE,(reviewPage+1)*PAGE_SIZE).map((lesson,j)=>{const i=reviewPage*PAGE_SIZE+j;return <div className="draft-row" key={lesson.id}>
    <div className="draft-day">{planDayNumber((target?.lessons.length??0)+i,target?.pace??pace)}<small>{dateLabel(plannedDay(target?.planStart??start,(target?.lessons.length??0)+i,target?.pace??pace)??localDay())}</small></div>
    <div className="draft-info"><input aria-label={`Item for day ${i+1}`} maxLength={200} value={lesson.title} onChange={e=>setDraft({...draft,lessons:draft.lessons.map(l=>l.id===lesson.id?{...l,title:e.target.value}:l)})}/><a href={lesson.url} target="_blank" rel="noopener noreferrer">{lesson.group?`${lesson.group} · `:''}Open <ArrowUpRight size={11}/></a></div>
    <div className="draft-actions"><button className="icon-button" disabled={i===0} onClick={()=>move(lesson.id,-1)} aria-label={`Move item up ${i+1}`}><ArrowUp size={15}/></button><button className="icon-button" disabled={i===reviewed.length-1} onClick={()=>move(lesson.id,1)} aria-label={`Move item down ${i+1}`}><ArrowDown size={15}/></button><button className="icon-button" onClick={()=>setDraft({...draft,lessons:draft.lessons.filter(l=>l.id!==lesson.id)})} aria-label={`Remove item ${i+1}`}><X size={15}/></button></div>
   </div>})}</div></details>
   {!reviewed.length&&<p className="error">{target&&!draft.lessons.length?'These items are already in the collection.':'Choose a section or add items.'}</p>}
   {target&&target.lessons.length+reviewed.length>2000&&<p className="error">A collection can contain up to 2,000 items.</p>}
   {limitReached&&<p className="error" role="alert">You can have up to 30 collections. Delete one to add another.</p>}
   <div className="dialog-footer"><button className="button secondary" onClick={()=>setDraft(null)}>Back</button><button className="button primary" disabled={limitReached||!!target&&target.lessons.length+reviewed.length>2000||!draft.title.trim()||!reviewed.length||reviewed.some(l=>!l.title.trim())||!plannedDay(start,0,pace)} onClick={()=>onSave({...draft,lessons:reviewed,planStart:start,pace})}>{target?'Add lessons':'Create collection'}<ArrowRight size={16}/></button></div>
  </>}
 </dialog>;
}

export default function Planner({startView='today'}:{startView?:'home'|'today'}) {
 const [courses,setCourses]=useState<Course[]>([]);
 const [query,setQuery]=useState('');
 const [active,setActive]=useState('');
 const [planPage,setPlanPage]=useState(0);
 const [selected,setSelected]=useState<string|null>(null);
 const [view,setView]=useState<'home'|'today'|'history'|'daily'>(startView);
 const [ready,setReady]=useState(false);
 const [storageError,setStorageError]=useState('');
 const [notice,setNotice]=useState('');
 const [showImport,setShowImport]=useState(false);
 const [showBackup,setShowBackup]=useState(false);
 const [importTarget,setImportTarget]=useState<string|null>(null);
 const [opened,setOpened]=useState<{courseId:string;lessonId:string;at:number}|null>(null);
 const [undo,setUndo]=useState<{courseId:string;lessonId:string;previous:string|null}|null>(null);
 const [editingLessonTitle,setEditingLessonTitle]=useState<string|null>(null);
 const [lessonTitle,setLessonTitle]=useState('');
 useEffect(()=>{
  try {
   const saved=localStorage.getItem(STORAGE_KEY);
   if(saved){const data:unknown=JSON.parse(saved);if(!validCourses(data))throw new Error('invalid');setCourses(data);const last=localStorage.getItem(ACTIVE_KEY);const requested=new URLSearchParams(window.location.search).get('course');setActive(planCourseId(data,requested,last));if(requested&&data.some(c=>c.id===requested))setView('today');}
  }catch{setStorageError('Couldn’t read the saved data. Existing data was not overwritten.')}
  if(new URLSearchParams(window.location.search).get('add')==='1')setShowImport(true);
  if(new URLSearchParams(window.location.search).get('backup')==='1')setShowBackup(true);
  window.history.replaceState(null,'',window.location.pathname);
  setReady(true);
 },[]);
 useEffect(()=>{
  if(!ready||storageError)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(courses));localStorage.setItem(ACTIVE_KEY,active)}
  catch{setStorageError('Changes were not saved. Download a progress backup.')}
 },[courses,active,ready,storageError]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),6500);return()=>clearTimeout(id)},[notice]);
 const course=courses.find(c=>c.id===active)??courses[0]??EMPTY;
 const next=nextLesson(course);
 const lesson=course.lessons.find(l=>l.id===selected)??next??course.lessons.at(-1)??EMPTY_LESSON;
 const index=course.lessons.findIndex(l=>l.id===lesson.id);
 const historyPage=Math.min(planPage,Math.max(0,Math.ceil(course.lessons.length/PAGE_SIZE)-1));
 const done=course.lessons.filter(l=>l.completedAt).length;
 const finished=done===course.lessons.length;
 const planned=plannedDay(course.planStart,index,course.pace);
 const lessonKey=`${course.id}:${lesson.id}`;
 function update(updated:Course){setCourses(prev=>prev.map(c=>c.id===updated.id?updated:c))}
 function renameCollection(id:string,title:string){setCourses(prev=>prev.map(c=>c.id===id?{...c,title}:c))}
 function renameTodayLesson(courseId:string,lessonId:string,title:string){setCourses(prev=>prev.map(c=>c.id===courseId?renameMaterial(c,lessonId,title):c));setNotice('Name saved.')}
 function switchCourse(id:string){setPlanPage(0);setActive(id);setSelected(null);setView('history')}
 function deleteCollection(id:string) {
  const item=courses.find(c=>c.id===id);if(!item)return;
  if(!window.confirm(`Delete “${item.title}”? The notes, recordings, and progress for this collection will be deleted.`))return;
  void deleteCourseRecordings(id).catch(()=>setNotice('The collection was deleted, but its audio couldn’t be removed.'));
  const result=removeCourse(courses,id,active);setCourses(result.courses);setActive(result.active);setSelected(null);setUndo(null);setNotice('Collection deleted.');
 }
 function renameLesson(id:string,title:string){setCourses(prev=>prev.map(c=>c.id===course.id?renameMaterial(c,id,title):c));}
 function saveLessonTitle(event:React.FormEvent){
  event.preventDefault();const next=lessonTitle.trim().slice(0,200);if(!next)return;
  renameLesson(lesson.id,next);setEditingLessonTitle(null);setLessonTitle('');setNotice('Name saved.');
 }
 function moveLesson(id:string,target:string){
  const position=course.lessons.findIndex(l=>l.id===target);
  setCourses(prev=>prev.map(c=>c.id===course.id?reorderMaterials(c,id,target):c));
  if(position>=0)setPlanPage(Math.floor(position/PAGE_SIZE));
 }
 function deleteLesson(id:string){
  const item=course.lessons.find(l=>l.id===id);if(!item)return;
  if(!window.confirm(`Delete “${item.title}” along with its notes and audio?`))return;
  void deleteLessonRecordings(course.id,id).catch(()=>setNotice('The item was deleted, but its audio couldn’t be removed.'));
  setCourses(prev=>prev.map(c=>c.id===course.id?removeMaterial(c,id):c));
  if(selected===id)setSelected(null);setUndo(null);setNotice('Item deleted.');
 }
 function toggleMaterial(courseId:string,lessonId:string){
  const item=courses.find(c=>c.id===courseId)?.lessons.find(l=>l.id===lessonId);if(!item)return;
  setUndo({courseId,lessonId,previous:item.completedAt});
  setCourses(prev=>prev.map(c=>c.id===courseId?completeLesson(c,lessonId,item.completedAt?null:new Date().toISOString()):c));
  setNotice(item.completedAt?'Marked as not done.':'Saved.');
  if(opened?.courseId===courseId&&opened.lessonId===lessonId)setOpened(null);
 }
 function toggleDone(){toggleMaterial(course.id,lesson.id)}
 function undoDone(){if(!undo)return;setCourses(prev=>prev.map(c=>c.id===undo.courseId?completeLesson(c,undo.lessonId,undo.previous):c));setUndo(null);setNotice('Completion undone.')}
 function saveCourse(incoming:Course){
  if(!importTarget&&!courses.some(c=>c.id===incoming.id)&&courses.length>=30){setNotice('You can have up to 30 collections. Delete one to add another.');return;}

  if(importTarget){
   const target=courses.find(c=>c.id===importTarget);if(!target)return;
   const updated=appendCourse(target,incoming.lessons);
   setCourses(prev=>prev.map(c=>c.id===target.id?updated:c));setActive(target.id);setView('history');setPlanPage(Math.floor(target.lessons.length/PAGE_SIZE));setSelected(null);setUndo(null);
   setShowImport(false);setImportTarget(null);setNotice(`Added: ${updated.lessons.length-target.lessons.length}`);return;
  }
  setCourses(prev=>{const old=prev.find(c=>c.id===incoming.id);const merged=mergeCourse(old,incoming);return old?prev.map(c=>c.id===incoming.id?merged:c):[...prev,merged]});
  setActive(incoming.id);setSelected(null);setView('history');setShowImport(false);setUndo(null);setNotice('Plan saved.');
 }
 function download(){const blob=new Blob([JSON.stringify(courses,null,2)],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='day-by-day-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000)}
 function restoreCourses(restored:Course[]){
  if(storageError)throw new Error('First save your current data with the Download button. Storage is currently unavailable.');
  // Commit before updating the UI so quota failures leave the current plan intact.
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(restored))}catch{throw new Error('There isn’t enough storage space. Current data was not changed.');}
  setCourses(restored);setActive(planCourseId(restored,null,active));setSelected(null);setUndo(null);setView('home');setNotice('Backup restored.');
 }
 function goLesson(id:string){setSelected(id);setView('today')}
 function updatePace(nextPace:CoursePace){update({...course,pace:nextPace});setNotice(`Pace changed to ${paceLabel(nextPace)}.`)}
 const finish=course.lessons.length?plannedDay(course.planStart,course.lessons.length-1,course.pace):null;
 const noteCount=course.lessons.filter(item=>item.note.trim()).length;
 const openedLesson=opened&&courses.find(item=>item.id===opened.courseId)?.lessons.find(item=>item.id===opened.lessonId);
 return <div className={`app view-${view}`}><a className="skip-link" href="#main-content">Skip to content</a>
  <AppHeader active={view==='home'||view==='history'?'collections':'today'} onToday={()=>{setView('daily');setSelected(null)}} onCollections={()=>setView('home')} onAdd={()=>{setImportTarget(null);setShowImport(true)}} onBackup={()=>setShowBackup(true)}/>
  <aside className="sidebar minimal-sidebar">
   <div className="collection-heading"><span>Collections</span></div>
   <CollectionList courses={courses} active={course.id} onPick={switchCourse} onDelete={deleteCollection} onRename={renameCollection} onReorder={(id,target)=>setCourses(prev=>reorderCourses(prev,id,target))}/>
   <div className="sidebar-bottom"><button className="backup-button" onClick={()=>setShowBackup(true)} disabled={!ready}><Download size={14}/>Progress backup</button></div>
  </aside>
  <div className="main-wrap">
   <main id="main-content" tabIndex={-1}>
    {storageError&&<div className="storage-warning" role="alert">{storageError}<button onClick={download}>Download</button></div>}
    {!ready?<p className="loading-state">Loading…</p>:view==='daily'?<TodayPlan courses={courses} onToggle={toggleMaterial} onOpened={(courseId,lessonId)=>setOpened({courseId,lessonId,at:Date.now()})} onLesson={(courseId,lessonId)=>{setActive(courseId);setSelected(lessonId);setView('today');setPlanPage(0)}} onRename={renameTodayLesson} onAdd={()=>{setImportTarget(null);setShowImport(true)}} onHome={()=>setView('home')}/>:view==='home'?<CourseDashboard query={query} onQuery={setQuery} courses={courses} active={course.id} onPick={switchCourse} onAdd={()=>{setImportTarget(null);setShowImport(true)}} onDelete={deleteCollection} onRename={renameCollection} onReorder={(id,target)=>setCourses(prev=>reorderCourses(prev,id,target))}/>:!courses.length?<section className="first-run-card today-empty"><BookOpen size={28}/><h2>Start with one link</h2><button className="button primary" onClick={()=>setShowImport(true)}>Add a link<Plus size={16}/></button></section>:!course.lessons.length?<section className="first-run-card today-empty"><BookOpen size={28}/><h2>Nothing here yet</h2><button className="button primary" onClick={()=>{setImportTarget(course.id);setShowImport(true)}}><Plus size={16}/>Add links</button></section>:view==='today'?<div className="lesson-page">
     <button className="lesson-back" onClick={()=>setView('history')}>← {course.title}</button>
     {finished&&!selected?<section className="collection-complete"><Check size={30}/><h1>Collection complete!</h1><p>{course.title} · {done} of {course.lessons.length} lessons</p><div className="complete-stats"><span><b>{done}</b>lessons completed</span><span><b>{courseDuration(course.lessons.length,course.pace)}</b>days in the plan</span></div><div className="button-row"><button className="button primary" onClick={()=>setShowImport(true)}>Add a new collection</button><button className="button secondary" onClick={()=>setView('history')}>Open plan</button></div></section>:<>
      <section className="lesson-card"><div className="material-top"><span className="day-label">DAY {planDayNumber(index,course.pace)} OF {courseDuration(course.lessons.length,course.pace)}</span><span className="material-date">{lesson.group&&<b>{lesson.group}</b>}{planned?dateLabel(planned):paceLabel(course.pace)}</span></div>{editingLessonTitle===lessonKey?<form className="lesson-title-form" onSubmit={saveLessonTitle}><input aria-label="Lesson title" value={lessonTitle} onChange={event=>setLessonTitle(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setEditingLessonTitle(null)}}} onFocus={event=>event.currentTarget.select()} maxLength={200} autoFocus/><button className="button primary" disabled={!lessonTitle.trim()}><Check size={16}/>Save</button><button type="button" className="icon-button" onClick={()=>setEditingLessonTitle(null)} aria-label="Cancel editing"><X size={18}/></button></form>:<div className="lesson-title-row"><h1>{lesson.title}</h1><button className="icon-button lesson-title-edit" onClick={()=>{setLessonTitle(lesson.title);setEditingLessonTitle(lessonKey)}} aria-label="Edit lesson title"><Pencil size={18}/></button></div>}<SourceArtwork lessonUrl={lesson.url} sourceUrl={course.sourceUrl} source={course.source}/><div className="material-actions"><a className="button primary" href={lesson.url} target="_blank" rel="noopener noreferrer" onClick={()=>setOpened({courseId:course.id,lessonId:lesson.id,at:Date.now()})}>Open lesson<ArrowUpRight size={17}/></a><button className={'button secondary '+(lesson.completedAt?'is-done':'')} onClick={toggleDone}>{lesson.completedAt?<RotateCcw size={15}/>:<Check size={17}/>}<span>{lesson.completedAt?'Mark as not done':'Done'}</span></button></div></section>
      <details className="note-card" key={lesson.id} open><summary className="voice-summary"><span>Note</span>{lesson.note&&<span className="voice-status">Saved</span>}</summary><div className="note-body"><label className="sr-only" htmlFor="material-note">Note for this lesson</label><textarea id="material-note" key={lesson.id} value={lesson.note} onChange={e=>update({...course,lessons:course.lessons.map(l=>l.id===lesson.id?{...l,note:e.target.value}:l)})} placeholder="What would you like to remember?" rows={4} maxLength={10000}/></div></details>
      <VoiceNote key={JSON.stringify([course.id,lesson.id])} courseId={course.id} lessonId={lesson.id}/><div className="lesson-pagination"><button disabled={index<=0} onClick={()=>index>0&&goLesson(course.lessons[index-1].id)}>{index>0?`← Day ${planDayNumber(index-1,course.pace)}`:'Previous'}</button><button disabled={index>=course.lessons.length-1} onClick={()=>index<course.lessons.length-1&&goLesson(course.lessons[index+1].id)}>{index<course.lessons.length-1?`Day ${planDayNumber(index+1,course.pace)} →`:'Next'}</button></div>
     </>}
    </div>:<div className="collection-plan"><div className="collection-plan-heading"><div><h1>{course.title}</h1><span>{course.source}</span></div><button className="button secondary" onClick={()=>{setImportTarget(course.id);setShowImport(true)}}><Plus size={15}/>Add links</button></div><section className="plan-overview"><div><strong>{done} of {course.lessons.length} · {paceLabel(course.pace)}</strong><span>{finish?`Finishes ${new Intl.DateTimeFormat('en',{day:'numeric',month:'long'}).format(new Date(finish+'T12:00:00'))}`:'Choose a start date'}</span></div><div className="plan-progress"><div className="progress-track"><span style={{width:`${course.lessons.length?done/course.lessons.length*100:0}%`}}/></div><span>Completed: {done} · notes {noteCount}</span></div><div className="pace-edit" role="group" aria-label="Change pace">{([['daily','1 a day'],['twice-daily','2 a day'],['weekdays','Weekdays']] as const).map(([value,label])=><button key={value} className={(course.pace??'daily')===value?'active':''} onClick={()=>updatePace(value)}>{label}</button>)}</div></section><section className="history-card"><div className="history-header"><h2>Plan</h2><span>{done} / {course.lessons.length}</span></div><Pager page={historyPage} count={course.lessons.length} onChange={setPlanPage}/><MaterialList key={course.id} course={course} start={historyPage*PAGE_SIZE} count={PAGE_SIZE} onPick={goLesson} onRename={renameLesson} onDelete={deleteLesson} onReorder={moveLesson}/><Pager page={historyPage} count={course.lessons.length} onChange={setPlanPage}/></section></div>}
    <footer><AppTools/></footer>
   </main>
  </div>
  <nav className="mobile-nav" aria-label="Mobile navigation"><button className={view==='daily'||view==='today'?'selected':''} onClick={()=>{setView('daily');setSelected(null)}}><BookOpen size={18}/>Today</button><button className={view==='home'||view==='history'?'selected':''} onClick={()=>setView('home')}><List size={18}/>Collections</button></nav>
  {opened&&openedLesson&&<div className="return-prompt" role="dialog" aria-label="Mark lesson complete"><div><b>Finished “{openedLesson.title}”?</b><span>{courses.find(item=>item.id===opened.courseId)?.title} · opened recently</span></div><button className="button primary" onClick={()=>toggleMaterial(opened.courseId,opened.lessonId)}>Yes, done</button><button className="button secondary" onClick={()=>setOpened(null)}>Not yet</button></div>}
  {notice&&<div className="toast" role="status"><Check size={16}/><span>{notice}</span>{undo&&<button onClick={undoDone}>Undo</button>}<button className="icon-button" onClick={()=>setNotice('')} aria-label="Close notification"><X size={15}/></button></div>}
  {showBackup&&<BackupDialog courses={courses} onClose={()=>setShowBackup(false)} onDownload={download} onRestore={restoreCourses}/>}
  {showImport&&<ImportDialog existingIds={courses.map(c=>c.id)} target={courses.find(c=>c.id===importTarget)} onClose={()=>{setShowImport(false);setImportTarget(null)}} onSave={saveCourse}/>}
 </div>;
}
