'use client';
import {useEffect,useRef,useState} from 'react';
import {Download,Upload,X,Check} from 'lucide-react';
import type {Course} from '@/lib/course';
import {MAX_BACKUP_BYTES,parseBackup,mergeBackup} from '@/lib/backup';
export default function BackupDialog({courses,onClose,onDownload,onRestore}:{courses:Course[];onClose:()=>void;onDownload:()=>void;onRestore:(courses:Course[])=>void}){
 const dialog=useRef<HTMLDialogElement>(null),file=useRef<HTMLInputElement>(null);
 const [incoming,setIncoming]=useState<Course[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 async function read(selected:File|undefined){
  if(!selected)return;setError('');setIncoming(null);setBusy(true);
  try{if(selected.size>MAX_BACKUP_BYTES)throw new Error('The file is too large. Maximum size is 10 MB.');const parsed=parseBackup(await selected.text());mergeBackup(courses,parsed);setIncoming(parsed)}catch(e){setError(e instanceof Error?e.message:'Couldn’t read the file.')}finally{setBusy(false);if(file.current)file.current.value=''}
 }
 function restore(){if(!incoming)return;try{onRestore(mergeBackup(courses,incoming));onClose()}catch(e){setError(e instanceof Error?e.message:'Couldn’t restore the backup.')}}
 return <dialog className="import-dialog backup-dialog" ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}} aria-labelledby="backup-title">
  <div className="dialog-heading"><h2 id="backup-title">Progress backup</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></div>
  <p>Collections, completion marks, and notes in one file. Audio is downloaded separately from each recording.</p>
  <div className="backup-actions"><button className="button secondary" onClick={onDownload} disabled={!courses.length}><Download size={17}/>Download backup</button><button className="button secondary" onClick={()=>file.current?.click()} disabled={busy}><Upload size={17}/>{busy?'Reading…':'Choose backup'}</button></div>
  <input className="sr-only" tabIndex={-1} aria-label="Progress backup file" type="file" accept=".json,application/json" ref={file} onChange={e=>void read(e.target.files?.[0])}/>
  {incoming&&<div className="backup-review"><b>Collections: {incoming.length} · Items: {incoming.reduce((n,c)=>n+c.lessons.length,0)}</b><p>Missing collections and items will be added. Current notes and completion marks will be preserved.</p><button className="button primary" onClick={restore}><Check size={17}/>Restore</button></div>}
  {error&&<p className="error" role="alert">{error}</p>}
 </dialog>;
}
