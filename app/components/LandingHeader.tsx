'use client';

import {useState} from 'react';
import {BRAND_NAME} from '@/lib/brand';

function MenuIcon({open}:{open:boolean}){
 return open?<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>:<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}

export default function LandingHeader(){
 const [open,setOpen]=useState(false);
 function close(){setOpen(false)}
 return <header className="landing-header">
  <div className="landing-container landing-header-inner">
   <a className="landing-brand" href="/" aria-label={`${BRAND_NAME}, главная`}><img src="/brand/step-flag.svg" alt="" width="42" height="30"/><span>{BRAND_NAME}</span></a>
   <nav className="landing-nav" aria-label="Навигация по лендингу"><a href="#ways">Два способа</a><a href="#how">Как это работает</a></nav>
   <a className="landing-button landing-button-primary landing-header-cta" href="/app?add=1">Собрать курс</a>
   <button className="landing-menu-button" type="button" aria-label={open?'Закрыть меню':'Открыть меню'} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={()=>setOpen(value=>!value)}><MenuIcon open={open}/></button>
  </div>
  <div className={'landing-mobile-menu '+(open?'is-open':'')} id="landing-mobile-menu" hidden={!open}><nav aria-label="Мобильная навигация"><a href="#ways" onClick={close}>Два способа</a><a href="#how" onClick={close}>Как это работает</a><a href="/app?add=1" onClick={close}>Собрать курс</a></nav></div>
 </header>;
}
