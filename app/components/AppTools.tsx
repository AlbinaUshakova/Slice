'use client';
import {useEffect,useRef,useState} from 'react';
import {Download,Heart,X,WifiOff} from 'lucide-react';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function AppTools(){
 const [installed,setInstalled]=useState(false);const [install,setInstall]=useState<InstallEvent|null>(null);const [help,setHelp]=useState(false);const [ios,setIos]=useState(false);const [offline,setOffline]=useState(false);const [donation,setDonation]=useState<string|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const mode=window.matchMedia('(display-mode: standalone)');const status=()=>setInstalled(mode.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);
  status();setIos(/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);setOffline(!navigator.onLine);
  const available=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent)};const done=()=>{setInstalled(true);setInstall(null)};const online=()=>setOffline(false);const disconnected=()=>setOffline(true);
  window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',done);window.addEventListener('online',online);window.addEventListener('offline',disconnected);mode.addEventListener('change',status);
  if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Online use remains available if the browser blocks offline storage. */})}
  fetch('/api/support').then(r=>r.ok?r.json():null).then(data=>{if(data&&typeof data==='object'&&'url' in data&&typeof data.url==='string')setDonation(data.url)}).catch(()=>{});
  return()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',done);window.removeEventListener('online',online);window.removeEventListener('offline',disconnected);mode.removeEventListener('change',status)};
 },[]);
 useEffect(()=>{if(help)dialog.current?.showModal();else dialog.current?.close()},[help]);
 async function requestInstall(){if(!install){setHelp(true);return}try{await install.prompt();await install.userChoice}catch{setHelp(true)}finally{setInstall(null)}}
 return <div className="app-tools">
  {!installed&&<button className="install-app-button" onClick={()=>void requestInstall()}><Download size={14}/>Install</button>}
  {donation&&<a href={donation} target="_blank" rel="noopener noreferrer"><Heart size={14}/>Support</a>}
  {offline&&<span className="offline-status" role="status"><WifiOff size={13}/>Offline</span>}
  <dialog ref={dialog} className="import-dialog install-dialog" onCancel={()=>setHelp(false)} onClick={e=>{if(e.target===e.currentTarget)setHelp(false)}}>
   <div className="dialog-heading"><h2>Install the app</h2><button className="icon-button" aria-label="Close" onClick={()=>setHelp(false)}><X size={20}/></button></div>
   <img className="install-logo" src="/brand/step-flag-app.svg" width="72" height="72" alt=""/>
   {ios?<p>In Safari: <b>Share → Add to Home Screen → Add</b>.</p>:<p>In your browser menu, choose <b>Install app</b> or <b>Add to Home Screen</b>.</p>}
   <p className="field-hint">Don’t see this option? Open the site in Safari or Chrome.</p>
   <button className="button primary wide" onClick={()=>setHelp(false)}>Got it</button>
  </dialog>
 </div>;
}
