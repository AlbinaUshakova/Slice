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
import {ArrowUpRight,ArrowRight,ArrowUp,ArrowDown,Check,Plus,X,BookOpen,RotateCcw,Download,Trash2,List,House} from 'lucide-react';
import {Course,Lesson,STORAGE_KEY,ACTIVE_KEY,nextLesson,completeLesson,mergeCourse,validCourses,localDay,plannedDay,removeCourse,reorderCourses} from '@/lib/course';

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
 const [draftPage,setDraftPage]=useState(0);
 const [draft,setDraft]=useState<Course|null>(null);
 const [levels,setLevels]=useState<string[]>([]);
 const [start,setStart]=useState(localDay());
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close()},[]);
 const groups=[...new Set(draft?.lessons.map(l=>l.group).filter((g):g is string=>!!g))];
 const limitReached=!target&&existingIds.length>=30&&!!draft&&!existingIds.includes(draft.id);
 const reviewed=draft?.lessons.filter(l=>!l.group||levels.includes(l.group))??[];
 const reviewPage=Math.min(draftPage,Math.max(0,Math.ceil(reviewed.length/PAGE_SIZE)-1));
 function review(course:Course){if(target)course={...course,lessons:newLessons(target,course.lessons)};setDraftPage(0);setDraft(course);setLevels([...new Set(course.lessons.map(l=>l.group).filter((g):g is string=>!!g))]);}
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
 function move(id:string,by:number) {
  if(!draft)return;
  const position=reviewed.findIndex(l=>l.id===id);const target=reviewed[position+by];
  if(!target)return;
  const arr=[...draft.lessons];const a=arr.findIndex(l=>l.id===id);const b=arr.findIndex(l=>l.id===target.id);
  [arr[a],arr[b]]=[arr[b],arr[a]];setDraft({...draft,lessons:arr});
 }
 return <dialog ref={dialog} className="import-dialog" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="dialog-heading"><h2>{draft?'Review the plan':target?'Add links':'New collection'}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></div>
  {target&&<p className="append-target">{target.title}</p>}
  {!draft?<>
   <form onSubmit={e=>{e.preventDefault();void find()}}>
    <label htmlFor="material-links">Links</label>
    <textarea id="material-links" className="link-input" rows={4} value={input} disabled={busy} onChange={e=>setInput(e.target.value)} placeholder={'https://…'} required maxLength={420000} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="links-hint"/>
    <p id="links-hint" className="field-hint">A Stepik course, YouTube playlist, RSS/Atom feed, or articles. Put multiple links on separate lines.</p>
    <details className="import-help"><summary>Examples and tips</summary><p>For a podcast, you can paste a direct RSS/Atom link. For Telegram, copy links from the pinned post; private messages cannot be read.</p><p>Custom title: Title | https://…</p>
    <div className="example-links"><span>Try:</span><button disabled={busy} type="button" onClick={()=>setInput('https://naked-science.ru/tags/kosmos')}>Space</button><button disabled={busy} type="button" onClick={()=>setInput('https://aferin.me/program')}>Turkish</button><button disabled={busy} type="button" onClick={()=>setInput('https://www.youtube.com/playlist?list=PLssRXZAfmWU510niYlySaZnOLHwj2jTUP')}>YouTube</button></div></details>
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="button primary wide" disabled={busy}>{busy?'Finding items…':target?'Continue':'Build plan'}{!busy&&<ArrowRight size={16}/>}</button>
   </form>
  </>:<>
   {draft.importNotice&&<p className="import-notice" role="status" >{draft.importNotice}</p>}
   {!target&&<><label htmlFor="draft-title">Title</label><input id="draft-title" value={draft.title} maxLength={120} onChange={e=>setDraft({...draft,title:e.target.value})}/></>}
   {groups.length>0&&<fieldset className="level-select"><legend>{groups.every(g=>/^[ABC][12]$/.test(g))?'Levels':'Sections'}</legend>{groups.map(group=><label key={group}><input type="checkbox" checked={levels.includes(group)} onChange={()=>setLevels(prev=>prev.includes(group)?prev.filter(g=>g!==group):[...prev,group])}/><span>{group}</span></label>)}</fieldset>}
   <div className="plan-options">{target?<span><b>From day {target.lessons.length+1}</b></span>:<div><label htmlFor="start-date">Start date</label><input id="start-date" type="date" value={start} onChange={e=>setStart(e.target.value)} required/></div>}<span>1 item a day<br/><b>Days: {reviewed.length}</b></span></div>
   <Pager page={reviewPage} count={reviewed.length} onChange={setDraftPage}/><div className="draft-list" key={reviewPage}>{reviewed.slice(reviewPage*PAGE_SIZE,(reviewPage+1)*PAGE_SIZE).map((lesson,j)=>{const i=reviewPage*PAGE_SIZE+j;return <div className="draft-row" key={lesson.id}>
    <div className="draft-day">Day {(target?.lessons.length??0)+i+1}<small>{dateLabel(plannedDay(target?.planStart??start,(target?.lessons.length??0)+i)??localDay())}</small></div>
    <div className="draft-info"><input aria-label={`Item for day ${i+1}`} maxLength={200} value={lesson.title} onChange={e=>setDraft({...draft,lessons:draft.lessons.map(l=>l.id===lesson.id?{...l,title:e.target.value}:l)})}/><a href={lesson.url} target="_blank" rel="noopener noreferrer">{lesson.group?`${lesson.group} · `:''}Open <ArrowUpRight size={11}/></a></div>
    <div className="draft-actions"><button className="icon-button" disabled={i===0} onClick={()=>move(lesson.id,-1)} aria-label={`Move item up ${i+1}`}><ArrowUp size={15}/></button><button className="icon-button" disabled={i===reviewed.length-1} onClick={()=>move(lesson.id,1)} aria-label={`Move item down ${i+1}`}><ArrowDown size={15}/></button><button className="icon-button" onClick={()=>setDraft({...draft,lessons:draft.lessons.filter(l=>l.id!==lesson.id)})} aria-label={`Remove item ${i+1}`}><X size={15}/></button></div>
   </div>})}</div>
   {!reviewed.length&&<p className="error">{target&&!draft.lessons.length?'These items are already in the collection.':'Choose a section or add items.'}</p>}
   {target&&target.lessons.length+reviewed.length>2000&&<p className="error">A collection can contain up to 2,000 items.</p>}
   {limitReached&&<p className="error" role="alert">You can have up to 30 collections. Delete one to add another.</p>}
   <div className="dialog-footer"><button className="button secondary" onClick={()=>setDraft(null)}>Back</button><button className="button primary" disabled={limitReached||!!target&&target.lessons.length+reviewed.length>2000||!draft.title.trim()||!reviewed.length||reviewed.some(l=>!l.title.trim())||!plannedDay(start,0)} onClick={()=>onSave({...draft,lessons:reviewed,planStart:start})}>{target?'Add':'Save'}<Check size={16}/></button></div>
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
 const [undo,setUndo]=useState<{courseId:string;lessonId:string;previous:string|null}|null>(null);
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
 const planned=plannedDay(course.planStart,index);
 function update(updated:Course){setCourses(prev=>prev.map(c=>c.id===updated.id?updated:c))}
 function renameCollection(id:string,title:string){setCourses(prev=>prev.map(c=>c.id===id?{...c,title}:c))}
 function renameTodayLesson(courseId:string,lessonId:string,title:string){setCourses(prev=>prev.map(c=>c.id===courseId?renameMaterial(c,lessonId,title):c));setNotice('Name saved.')}
 function switchCourse(id:string){setPlanPage(0);setActive(id);setSelected(null);setView('today')}
 function deleteCollection(id:string) {
  const item=courses.find(c=>c.id===id);if(!item)return;
  if(!window.confirm(`Delete “${item.title}”? The notes, recordings, and progress for this collection will be deleted.`))return;
  void deleteCourseRecordings(id).catch(()=>setNotice('The collection was deleted, but its audio couldn’t be removed.'));
  const result=removeCourse(courses,id,active);setCourses(result.courses);setActive(result.active);setSelected(null);setUndo(null);setNotice('Collection deleted.');
 }
 function renameLesson(id:string,title:string){setCourses(prev=>prev.map(c=>c.id===course.id?renameMaterial(c,id,title):c));}
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
  setActive(incoming.id);setSelected(null);setView('today');setShowImport(false);setUndo(null);setNotice('Plan saved.');
 }
 function download(){const blob=new Blob([JSON.stringify(courses,null,2)],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='day-by-day-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000)}
 function restoreCourses(restored:Course[]){
  if(storageError)throw new Error('First save your current data with the Download button. Storage is currently unavailable.');
  // Commit before updating the UI so quota failures leave the current plan intact.
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(restored))}catch{throw new Error('There isn’t enough storage space. Current data was not changed.');}
  setCourses(restored);setActive(planCourseId(restored,null,active));setSelected(null);setUndo(null);setView('home');setNotice('Backup restored.');
 }
 function goLesson(id:string){setSelected(id);setView('today')}
 return <div className="app"><a className="skip-link" href="#main-content">Skip to content</a>
  <aside className="sidebar">
   <nav aria-label="Main navigation"><button className={'nav-item '+(view==='home'?'active':'')} onClick={()=>setView('home')}><House size={17}/>Home</button><button className={'nav-item '+(view==='daily'?'active':'')} onClick={()=>{setView('daily');setSelected(null)}}><BookOpen size={17}/>Today</button><button className={'nav-item '+(view==='history'?'active':'')} onClick={()=>setView('history')}><List size={17}/>Plan</button></nav>
   <div className="collection-heading"><span>Collections</span></div>
   <CollectionList courses={courses} active={course.id} onPick={switchCourse} onDelete={deleteCollection} onRename={renameCollection} onReorder={(id,target)=>setCourses(prev=>reorderCourses(prev,id,target))}/>
   <div className="sidebar-bottom"><span className="local-status">Saved in this browser</span><button className="backup-button" onClick={()=>setShowBackup(true)} disabled={!ready}><Download size={13}/>Progress backup</button></div>
  </aside>
  <div className="main-wrap">
   <AppHeader courses={courses} query={query} onQuery={value=>{setQuery(value);setView('home')}} onHome={()=>{setQuery('');setView('home')}} onPick={id=>{setQuery('');switchCourse(id)}} onAdd={()=>{setImportTarget(null);setShowImport(true)}} onBackup={()=>setShowBackup(true)}/>
   <main id="main-content" tabIndex={-1}>
    {view!=='home'&&view!=='daily'&&<div className="page-heading"><div>{course.source&&!sameLabel(course.source,course.title)&&<span className="eyebrow">{course.source}</span>}<h1>{course.title}</h1></div>{courses.length>0&&<div className="collection-actions"><button className="button secondary" onClick={()=>{setImportTarget(course.id);setShowImport(true)}}><Plus size={15}/>Add links</button></div>}</div>}
    {storageError&&<div className="storage-warning" role="alert">{storageError}<button onClick={download}>Download</button></div>}
    {!ready?<p className="loading-state">Loading…</p>:view==='daily'?<TodayPlan courses={courses} onToggle={toggleMaterial} onLesson={(courseId,lessonId)=>{setActive(courseId);setSelected(lessonId);setView('today');setPlanPage(0)}} onRename={renameTodayLesson} onAdd={()=>{setImportTarget(null);setShowImport(true)}} onHome={()=>setView('home')}/>:view==='home'?<CourseDashboard query={query} onQuery={setQuery} courses={courses} active={course.id} onPick={switchCourse} onAdd={()=>{setImportTarget(null);setShowImport(true)}} onDelete={deleteCollection} onRename={renameCollection} onReorder={(id,target)=>setCourses(prev=>reorderCourses(prev,id,target))}/>:!courses.length?<section className="empty-state"><BookOpen size={25}/><h2>Where shall we start?</h2><p>A course, video, or articles — one a day.</p><button className="button primary" onClick={()=>setShowImport(true)}>Add a link<Plus size={16}/></button></section>:!course.lessons.length?<section className="empty-state"><BookOpen size={25}/><h2>Nothing here yet</h2><button className="button primary" onClick={()=>{setImportTarget(course.id);setShowImport(true)}}><Plus size={16}/>Add links</button></section>:view==='today'?<div className="dashboard-grid">
     <div className="content-column">
      {finished&&!selected?<section className="complete-card"><span className="eyebrow">{done} OF {course.lessons.length}</span><h2>All done!</h2><div className="button-row"><button className="button primary" onClick={()=>setView('history')}>Open plan</button><button className="button secondary" onClick={()=>setShowImport(true)}>New collection<Plus size={16}/></button></div></section>:<section className="material-card">
       <div className="material-top"><span className="day-label">Day {pad(index+1)}</span><span className="material-date">{lesson.group&&<b>{lesson.group}</b>}{lesson.completedAt?<><Check size={12}/>{dateLabel(lesson.completedAt)}</>:planned?dateLabel(planned):'1 item a day'}</span></div>
       <SourceArtwork lessonUrl={lesson.url} sourceUrl={course.sourceUrl} source={course.source}/>
       <div className="material-actions"><a className="button primary" href={lesson.url} target="_blank" rel="noopener noreferrer">Open<ArrowUpRight size={17}/></a><button className={'button secondary '+(lesson.completedAt?'is-done':'')} onClick={toggleDone}>{lesson.completedAt?<RotateCcw size={15}/>:<Check size={17}/>}<span>{lesson.completedAt?'Mark as not done':'Done'}</span></button></div>
       {lesson.completedAt&&next&&<button className="next-link" onClick={()=>setSelected(null)}>Next<ArrowRight size={15}/></button>}
      </section>}
      {(!finished||selected)&&<details className="note-card" key={lesson.id}><summary className="voice-summary"><span>Notes</span>{lesson.note&&<span className="voice-status">Note added</span>}</summary><div className="note-body"><label className="sr-only" htmlFor="material-note">Notes for this item</label><textarea id="material-note" key={lesson.id} value={lesson.note} onChange={e=>update({...course,lessons:course.lessons.map(l=>l.id===lesson.id?{...l,note:e.target.value}:l)})} placeholder="What would you like to remember?" rows={4} maxLength={10000}/></div></details>}
      {(!finished||selected)&&<VoiceNote key={JSON.stringify([course.id,lesson.id])} courseId={course.id} lessonId={lesson.id}/>}
     </div>
     <aside className="plan-column">
      <section className="progress-card"><div className="section-head"><h3>Progress</h3><span>{done} / {course.lessons.length}</span></div><div className="progress-track" role="progressbar" aria-label="Collection progress" aria-valuemin={0} aria-valuemax={course.lessons.length} aria-valuenow={done}><span style={{width:`${done/course.lessons.length*100}%`}}/></div></section>
      <section className="route-card"><div className="section-head"><h3>Plan</h3><span>{course.lessons.length}</span></div><div className="route-list">{course.lessons.slice(Math.max(0,index-2),Math.max(0,index-2)+5).map((l,j)=>{const i=Math.max(0,index-2)+j;return <button key={l.id} className={'route-item '+(l.id===lesson.id?'current ':'')+(l.completedAt?'completed':'')} onClick={()=>goLesson(l.id)} aria-current={l.id===lesson.id?'step':undefined}><span className="route-marker">{l.completedAt?<Check size={14}/>:pad(i+1)}</span><span className="route-title"><b>{l.title}</b><small>{l.group?`${l.group} · `:''}{plannedDay(course.planStart,i)?dateLabel(plannedDay(course.planStart,i)!):`Day ${i+1}`} </small></span></button>})}</div><button className="all-materials" onClick={()=>setView('history')}>Full plan<ArrowRight size={14}/></button></section>
     </aside>
    </div>:<section className="history-card"><div className="history-header"><h2>Plan</h2><span>{done} / {course.lessons.length}</span></div><Pager page={historyPage} count={course.lessons.length} onChange={setPlanPage}/><MaterialList key={course.id} course={course} start={historyPage*PAGE_SIZE} count={PAGE_SIZE} onPick={goLesson} onRename={renameLesson} onDelete={deleteLesson} onReorder={moveLesson}/><Pager page={historyPage} count={course.lessons.length} onChange={setPlanPage}/></section>}
    <footer><AppTools/></footer>
   </main>
  </div>
  <nav className="mobile-nav" aria-label="Mobile navigation"><button className={view==='home'?'selected':''} onClick={()=>setView('home')}><House size={18}/>Home</button><button className={view==='daily'?'selected':''} onClick={()=>{setView('daily');setSelected(null)}}><BookOpen size={18}/>Today</button><button className={view==='history'?'selected':''} onClick={()=>setView('history')}><List size={18}/>Plan</button><button onClick={()=>setShowImport(true)}><Plus size={18}/>Collection</button></nav>
  {notice&&<div className="toast" role="status"><Check size={16}/><span>{notice}</span>{undo&&<button onClick={undoDone}>Undo</button>}<button className="icon-button" onClick={()=>setNotice('')} aria-label="Close notification"><X size={15}/></button></div>}
  {showBackup&&<BackupDialog courses={courses} onClose={()=>setShowBackup(false)} onDownload={download} onRestore={restoreCourses}/>}
  {showImport&&<ImportDialog existingIds={courses.map(c=>c.id)} target={courses.find(c=>c.id===importTarget)} onClose={()=>{setShowImport(false);setImportTarget(null)}} onSave={saveCourse}/>}
 </div>;
}
