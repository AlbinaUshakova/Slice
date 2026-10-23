import type {Metadata} from 'next';
import LandingHeader from './components/LandingHeader';
import {BRAND_NAME} from '@/lib/brand';
import './landing.css';
import './landing-match.css';

export const metadata:Metadata={
 title:`${BRAND_NAME} — a course built from your links`,
 description:'Turn saved articles, videos and podcasts into a personal course. Add links yourself or split one long piece into daily lessons.',
};

const lessons=[['Article','next lesson'],['Video','day 2'],['Podcast, part 1','day 3'],['Podcast, part 2','day 4']];

export default function LandingPage(){return <div className="landing-page" lang="en">
 <LandingHeader/>
 <main className="landing-main">
  <section className="landing-container landing-hero" aria-labelledby="landing-title">
   <div className="landing-hero-copy"><span className="landing-tag">A COURSE BUILT FROM YOUR LINKS</span><h1 id="landing-title">Turn your saved links into a course of your own</h1><p className="landing-lead">Articles, videos and podcasts in one route. Add links yourself or let {BRAND_NAME} split a long piece into lessons.<span className="landing-desktop-copy"> Then one lesson a day, at your own pace.</span></p><div className="landing-hero-actions"><a className="landing-button landing-button-primary" href="/app?add=1">Build a course</a><a className="landing-button landing-button-secondary" href="#how">How it works</a></div><span className="landing-browser-note">Progress is saved in this browser</span></div>
   <div className="landing-card landing-product-card" aria-label="Example course plan"><span className="landing-card-label">NEW COLLECTION</span><div className="landing-demo-input"><div className="landing-demo-placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>Paste a link</div><a className="landing-button landing-button-primary landing-demo-add" href="/app?add=1">Add</a></div>{lessons.map(([title,meta],index)=><div className={'landing-lesson-row '+(index===0?'is-next ':'')+(index===3?'is-mobile-extra':'')} key={title}><span className="landing-lesson-number">{index+1}</span><span className="landing-lesson-title">{title}</span><span className="landing-meta">{index===0?<><span className="landing-meta-wide">next lesson</span><span className="landing-meta-mobile">next</span></>:meta}</span></div>)}</div>
  </section>

  <section className="landing-container landing-section" id="ways" aria-labelledby="ways-title"><div className="landing-section-heading"><h2 id="ways-title">Two ways to build a course</h2><p>Start with your own links or with one big piece of content.</p></div><div className="landing-ways-grid">
   <article className="landing-card landing-way-card"><span className="landing-tag">WAY 1</span><h3>Build it by hand</h3><p><span className="landing-wide-copy">Add links to articles, videos and podcasts. Each one becomes a lesson, and you see the whole route, day by day.</span><span className="landing-mobile-copy">Add links to articles, videos and podcasts — each one becomes a lesson.</span></p><div className="landing-way-visual"><div className="landing-link-row"><span>Link to an article</span><span className="landing-meta">day 1</span></div><div className="landing-link-row"><span>Link to a video</span><span className="landing-meta">day 2</span></div><div className="landing-link-row"><span>Link to a podcast</span><span className="landing-meta">day 3</span></div><a className="landing-link-row landing-add-row" href="/app?add=1">+ Add a link</a></div></article>
   <article className="landing-card landing-way-card"><span className="landing-tag">WAY 2</span><h3>Split it automatically</h3><p><span className="landing-wide-copy">Paste a playlist, a long video or audio — {BRAND_NAME} cuts it into lessons, one per day.</span><span className="landing-mobile-copy">Paste a playlist, a long video or audio — {BRAND_NAME} cuts it into lessons.</span></p><div className="landing-way-visual"><div className="landing-source-row"><span>Playlist or long recording</span><span className="landing-meta">1 link</span></div><svg className="landing-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M6 14l6 6 6-6"/></svg><div className="landing-bars" aria-hidden="true"><span/><span/><span/><span/><span/><span/></div><span className="landing-meta landing-bars-caption">Lessons 1–6 — one per day</span></div></article>
  </div></section>

  <section className="landing-container landing-section" id="how" aria-labelledby="how-title"><div className="landing-section-heading"><h2 id="how-title">How it works</h2></div><div className="landing-steps"><article className="landing-step"><span className="landing-step-number">1</span><h3>Add your links</h3><p className="landing-step-desktop-copy">Paste links to your materials — or one long one to split into lessons.</p><p className="landing-step-mobile"><strong>Add your links</strong> — or one long one to split.</p></article><article className="landing-step"><span className="landing-step-number">2</span><h3>Check the plan</h3><p className="landing-step-desktop-copy">{BRAND_NAME} lines up the lessons by day, so you see the whole route at once.</p><p className="landing-step-mobile"><strong>Check the plan</strong> — the whole route, day by day.</p></article><article className="landing-step"><span className="landing-step-number">3</span><h3>Take one lesson a day</h3><p className="landing-step-desktop-copy">The Today screen shows your next material, notes and progress.</p><p className="landing-step-mobile"><strong>One lesson a day</strong> — material, notes and progress.</p></article></div></section>

  <section className="landing-container landing-cta-wrap" aria-labelledby="cta-title"><div className="landing-cta"><h2 id="cta-title">Start with one link</h2><p>Paste your first link and see your day-by-day plan.</p><a className="landing-button" href="/app?add=1">Build a course</a></div></section>
 </main>
 <footer className="landing-container landing-footer"><span className="landing-footer-brand">{BRAND_NAME}</span><a href="/about">About</a><a href="/app?backup=1">Progress backup</a></footer>
 </div>}
