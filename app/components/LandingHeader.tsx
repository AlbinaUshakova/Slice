'use client';

import {useEffect,useState} from 'react';
import {BRAND_NAME} from '@/lib/brand';

function MenuIcon({open}:{open:boolean}){
 return open?<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>:<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}

function Brand(){return <a className="landing-brand" href="/" aria-label={`${BRAND_NAME}, home`}><img src="/brand/step-flag.svg" alt="" width="42" height="30"/><span>{BRAND_NAME}</span></a>}

export default function LandingHeader(){
 const [open,setOpen]=useState(false);
 function close(){setOpen(false)}
 useEffect(()=>{document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow=''}},[open]);
 return <header className="landing-header">
  <div className="landing-container landing-header-inner">
   <Brand/>
   <nav className="landing-nav" aria-label="Landing navigation"><a href="#ways">Two ways</a><a href="#how">How it works</a></nav>
   <a className="landing-button landing-button-primary landing-header-cta" href="/app?add=1">Build a course</a>
   <button className="landing-menu-button" type="button" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={()=>setOpen(value=>!value)}><MenuIcon open={open}/></button>
  </div>
  <div className="landing-mobile-menu" id="landing-mobile-menu" hidden={!open}>
   <div className="landing-mobile-menu-header"><Brand/><button className="landing-menu-button" type="button" aria-label="Close menu" onClick={close}><MenuIcon open/></button></div>
   <nav aria-label="Mobile navigation"><a href="#ways" onClick={close}><span>Two ways</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></a><a href="#how" onClick={close}><span>How it works</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></a><a href="/about" onClick={close}><span>About</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></a></nav>
   <a className="landing-button landing-button-primary landing-mobile-cta" href="/app?add=1" onClick={close}>Build a course</a>
  </div>
 </header>;
}
