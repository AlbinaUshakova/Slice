'use client';
import {Download,Menu,Plus,X} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import BrandLogo from './BrandLogo';
import {BRAND_NAME} from '@/lib/brand';

export default function AppHeader({active,onToday,onCollections,onAdd,onBackup}:{active:'today'|'collections';onToday:()=>void;onCollections:()=>void;onAdd:()=>void;onBackup:()=>void}){
 const [open,setOpen]=useState(false);const header=useRef<HTMLElement>(null);
 useEffect(()=>{const close=(event:PointerEvent)=>{if(!header.current?.contains(event.target as Node))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 return <header className="minimal-header" ref={header}>
  <a className="minimal-brand" href="/app" onClick={event=>{event.preventDefault();onToday()}} aria-label={`${BRAND_NAME}, app`}><BrandLogo tone="light"/></a>
  <nav className="minimal-nav" aria-label="Main navigation"><button className={active==='today'?'active':''} onClick={onToday}>Today</button><button className={active==='collections'?'active':''} onClick={onCollections}>Collections</button></nav>
  <div className="minimal-actions"><button className="button primary minimal-add" onClick={onAdd}><Plus size={17}/>Add link</button><button className="icon-button minimal-menu-trigger" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-controls="app-menu" aria-label="App menu">{open?<X size={21}/>:<Menu size={21}/>}</button></div>
  {open&&<div className="minimal-menu" id="app-menu"><button onClick={()=>{setOpen(false);onToday()}}>Today</button><button onClick={()=>{setOpen(false);onCollections()}}>Collections</button><button onClick={()=>{setOpen(false);onAdd()}}><Plus size={16}/>Add link</button><button onClick={()=>{setOpen(false);onBackup()}}><Download size={16}/>Progress backup</button><a href="/about">About</a></div>}
 </header>;
}
