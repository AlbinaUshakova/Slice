'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Square,Trash2,Download} from 'lucide-react';
import {getRecordings,saveRecording,deleteRecording,recordingKey,beginRecording,newRecording,Recording} from '@/lib/recordings';
export default function VoiceNote({courseId,lessonId}:{courseId:string;lessonId:string}){
 const key=recordingKey(courseId,lessonId);
 const [state,setState]=useState<'loading'|'idle'|'requesting'|'recording'|'saving'>('loading');
 const [clips,setClips]=useState<{key:string;url:string;type:string;createdAt:string;saved:boolean}[]>([]);
 const [error,setError]=useState('');
 const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);const alive=useRef(true);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const objectUrls=useRef(new Map<string,string>());
 function show(item:Recording,saved=true){const old=objectUrls.current.get(item.key);if(old)URL.revokeObjectURL(old);const url=URL.createObjectURL(item.blob);objectUrls.current.set(item.key,url);setClips(prev=>[...prev.filter(c=>c.key!==item.key),{key:item.key,url,type:item.blob.type,createdAt:item.createdAt,saved}])}
 function release(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(timer.current)clearTimeout(timer.current)}
 useEffect(()=>{
  alive.current=true;
  getRecordings(key).then(items=>{if(alive.current)items.forEach(item=>show(item))}).catch(()=>{if(alive.current)setError('Couldn’t read the recording.')}).finally(()=>{if(alive.current)setState('idle')});
  return()=>{alive.current=false;if(recorder.current?.state==='recording')recorder.current.stop();release();objectUrls.current.forEach(url=>URL.revokeObjectURL(url));objectUrls.current.clear()};
 },[key]);
 async function start(){
  setError('');
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setError('Recording is not supported by this browser.');return}
  setState('requesting');
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!alive.current){media.getTracks().forEach(t=>t.stop());return}stream.current=media;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
   const rec=new MediaRecorder(media,mime?{mimeType:mime}:undefined);recorder.current=rec;const chunks:BlobPart[]=[];let bytes=0,failed=false;
   rec.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>20_000_000&&rec.state==='recording')rec.stop()}};
   rec.onerror=()=>{failed=true;release();if(alive.current){setError('Recording stopped unexpectedly. Try again.');setState('idle')}};
   rec.onstop=async()=>{
    release();if(failed)return;
    const blob=new Blob(chunks,{type:rec.mimeType});if(!blob.size){if(alive.current){setError('The recording is empty. Try again.');setState('idle')}return}
    const item=newRecording(courseId,lessonId,blob);
    if(alive.current){setState('saving');show(item,false)}
    try{await saveRecording(item);if(alive.current)setClips(prev=>prev.map(c=>c.key===item.key?{...c,saved:true}:c))}
    catch{if(alive.current){setError('Couldn’t save it. Download the recording.')}}
    finally{if(alive.current)setState('idle')}
   };
   beginRecording(courseId,lessonId);rec.start(1000);setState('recording');
   timer.current=setTimeout(()=>{if(rec.state==='recording'){rec.stop();if(alive.current)setError('The 5-minute limit has been reached.')}},5*60*1000);
  }catch(e){release();if(alive.current){setState('idle');setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Allow microphone access in your browser settings.':'The microphone is unavailable. Check the connection.')}}
 }
 async function remove(id:string){try{await deleteRecording(id);const url=objectUrls.current.get(id);if(url)URL.revokeObjectURL(url);objectUrls.current.delete(id);setClips(prev=>prev.filter(c=>c.key!==id));setError('')}catch{setError('Couldn’t delete the recording. Try again.')}}
 const busy=state!=='idle'&&state!=='recording';
 return <details className="voice-card" onToggle={e=>{if(!e.currentTarget.open&&recorder.current?.state==='recording'){setState('saving');recorder.current.stop()}}}><summary className="voice-summary"><span>Audio notes</span><span className="voice-status">{state==='recording'?'Recording':state==='saving'?'Saving…':clips.length?String(clips.length):''}</span></summary><div className="voice-body">
  <div className="voice-clips">{clips.map((clip,i)=><div className="voice-clip" key={clip.key}><div className="voice-clip-heading"><span>Recording {i+1} · {new Intl.DateTimeFormat('en',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(clip.createdAt))}{!clip.saved?' · Not saved':''}</span><div><a className="icon-button" href={clip.url} download={`audio-note-${i+1}.`+(clip.type.includes('mp4')?'m4a':clip.type.includes('ogg')?'ogg':'webm')} aria-label={`Download recording ${i+1}`}><Download size={15}/></a><button className="icon-button" disabled={state==='saving'} onClick={()=>void remove(clip.key)} aria-label={`Delete recording ${i+1}`}><Trash2 size={15}/></button></div></div><audio controls src={clip.url} preload="metadata" aria-label={`Audio note ${i+1}`}/></div>)}</div>
  <div className="voice-actions">{state==='recording'?<button className="button secondary recording" onClick={()=>{setState('saving');recorder.current?.stop()}}><Square size={14}/>Stop</button>:<button className="button secondary" disabled={busy} onClick={()=>void start()}><Mic size={16}/>{state==='requesting'?'Requesting microphone access…':state==='loading'?'Loading…':'Record'}</button>}
  </div>
  {error&&(error.startsWith('Allow microphone')?<div className="microphone-error" role="alert"><b>No microphone access</b><p>Allow microphone access for this site in your browser settings, then try again.</p><div><button className="button secondary" type="button" onClick={()=>void start()}>Try again</button><button className="button ghost" type="button" onClick={()=>setError('')}>Not now</button></div></div>:<p className="error" role="alert">{error}</p>)}
 </div></details>;
}
