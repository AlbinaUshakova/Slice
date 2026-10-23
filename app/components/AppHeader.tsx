'use client';
import {useEffect,useRef} from 'react';
import {BookOpen,ChevronDown,Menu,Plus,Search,X,Download} from 'lucide-react';
import type {Course} from '@/lib/course';
import BrandLogo from './BrandLogo';
import {BRAND_NAME} from '@/lib/brand';
export default function AppHeader({courses,query,onQuery,onHome,onPick,onAdd,onBackup}:{courses:Course[];query:string;onQuery:(query:string)=>void;onHome:()=>void;onPick:(id:string)=>void;onAdd:()=>void;onBackup:()=>void}){
 const header=useRef<HTMLElement>(null);
 function close(){header.current?.querySelectorAll('details[open]').forEach(el=>el.removeAttribute('open'))}
 useEffect(()=>{const outside=(event:PointerEvent)=>{if(!header.current?.contains(event.target as Node))close()};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[]);
 return <header className="topbar quizlet-header" ref={header} onKeyDown={e=>{if(e.key==='Escape'){const open=header.current?.querySelector('details[open]');close();open?.querySelector('summary')?.focus()}}}>
  <a className="header-brand" href="/app" onClick={e=>{e.preventDefault();close();onHome()}} aria-label={`${BRAND_NAME}, app`}><BrandLogo tone="light"/></a>
  <div className="header-browse"><details className="header-dropdown"><summary aria-label="Collections"><BookOpen className="browse-icon" size={20}/><span className="browse-label">Collections</span><ChevronDown size={14}/></summary><div className="header-dropdown-panel"><button onClick={()=>{close();onHome()}}>All collections</button><div className="header-course-list">{courses.map(c=><button key={c.id} onClick={()=>{close();onPick(c.id)}}>{c.title}</button>)}</div></div></details></div>
  <form className="header-search" role="search" onSubmit={e=>{e.preventDefault();onQuery(query);close()}}><Search size={18}/><label className="sr-only" htmlFor="global-course-search">Search collections</label><input id="global-course-search" type="search" placeholder="Search" value={query} onChange={e=>onQuery(e.target.value)} autoComplete="off"/>{query&&<button type="button" className="icon-button" aria-label="Clear search" onClick={()=>onQuery('')}><X size={16}/></button>}</form>

  <div className="header-actions"><button className="header-add" aria-label="New collection" onClick={onAdd}><Plus size={17}/><span>Collection</span></button><details className="header-dropdown header-settings"><summary aria-label="App menu"><Menu className="settings-icon" size={20}/><span className="settings-label">Menu</span><ChevronDown size={14}/></summary><div className="header-dropdown-panel"><button className="header-backup" onClick={()=>{close();onBackup()}}><Download size={16}/>Progress backup</button><a href="/about">About</a></div></details></div>
 </header>;
}
