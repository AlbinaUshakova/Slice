import type {Metadata} from 'next';
import LandingHeader from './components/LandingHeader';
import {BRAND_NAME} from '@/lib/brand';
import './landing.css';

export const metadata:Metadata={
 title:`${BRAND_NAME} — личный курс из ваших ссылок`,
 description:'Соберите статьи, видео и подкасты в личный курс. Добавляйте ссылки сами или разбивайте большой материал на уроки — по одному в день.',
};

const lessons=[['Статья','следующий урок'],['Видео','день 2'],['Подкаст, часть 1','день 3'],['Подкаст, часть 2','день 4']];

export default function LandingPage(){return <div className="landing-page">
 <LandingHeader/>
 <main className="landing-main">
  <section className="landing-container landing-hero" aria-labelledby="landing-title">
   <div className="landing-hero-copy"><span className="landing-tag">ЛИЧНЫЙ КУРС ИЗ ВАШИХ ССЫЛОК</span><h1 id="landing-title">Соберите свой курс из того, что уже сохранили</h1><p className="landing-lead">Статьи, видео и подкасты — в один маршрут. Добавьте ссылки сами или доверьте {BRAND_NAME} разбить длинный материал на уроки. Дальше — по одному уроку в день, в своём темпе.</p><div className="landing-hero-actions"><a className="landing-button landing-button-primary" href="/app?add=1">Собрать курс</a><a className="landing-button landing-button-secondary" href="#how">Как это работает</a></div><span className="landing-browser-note">Прогресс сохраняется в этом браузере</span></div>
   <div className="landing-card landing-product-card" aria-label="Пример плана курса"><span className="landing-card-label">НОВАЯ ПОДБОРКА</span><div className="landing-demo-input"><div className="landing-demo-placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>Вставьте ссылку</div><a className="landing-button landing-button-primary landing-demo-add" href="/app?add=1">Добавить</a></div>{lessons.map(([title,meta],index)=><div className={'landing-lesson-row '+(index===0?'is-next':'')} key={title}><span className="landing-lesson-number">{index+1}</span><span className="landing-lesson-title">{title}</span><span className="landing-meta">{meta}</span></div>)}</div>
  </section>

  <section className="landing-container landing-section" id="ways" aria-labelledby="ways-title"><div className="landing-section-heading"><h2 id="ways-title">Два способа собрать курс</h2><p>Начните со своих ссылок или с одного большого материала.</p></div><div className="landing-ways-grid">
   <article className="landing-card landing-way-card"><span className="landing-tag">СПОСОБ 1</span><h3>Соберите сами</h3><p>Добавляйте ссылки на статьи, видео и подкасты. Каждая становится уроком, а вы видите весь маршрут по дням.</p><div className="landing-way-visual"><div className="landing-link-row"><span>Ссылка на статью</span><span className="landing-meta">день 1</span></div><div className="landing-link-row"><span>Ссылка на видео</span><span className="landing-meta">день 2</span></div><div className="landing-link-row"><span>Ссылка на подкаст</span><span className="landing-meta">день 3</span></div><div className="landing-link-row landing-add-row">+ Добавить ссылку</div></div></article>
   <article className="landing-card landing-way-card"><span className="landing-tag">СПОСОБ 2</span><h3>Разбейте автоматически</h3><p>Вставьте плейлист, длинное видео или аудио — {BRAND_NAME} нарежет их на уроки, по одному на день.</p><div className="landing-way-visual"><div className="landing-source-row"><span>Плейлист или длинная запись</span><span className="landing-meta">1 ссылка</span></div><svg className="landing-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M6 14l6 6 6-6"/></svg><div className="landing-bars" aria-hidden="true"><span/><span/><span/><span/><span/><span/></div><span className="landing-meta landing-bars-caption">Уроки 1–6 — по одному в день</span></div></article>
  </div></section>

  <section className="landing-container landing-section" id="how" aria-labelledby="how-title"><div className="landing-section-heading"><h2 id="how-title">Как это работает</h2></div><div className="landing-steps"><article className="landing-step"><span className="landing-step-number">1</span><h3>Добавьте ссылки</h3><p>Вставьте ссылки на материалы — или одну длинную, чтобы разбить её на уроки.</p></article><article className="landing-step"><span className="landing-step-number">2</span><h3>Посмотрите план</h3><p>{BRAND_NAME} выстроит уроки по дням, и вы увидите весь маршрут целиком.</p></article><article className="landing-step"><span className="landing-step-number">3</span><h3>Идите по одному уроку в день</h3><p>На экране «Сегодня» — следующий материал, заметки и прогресс подборки.</p></article></div></section>

  <section className="landing-container landing-cta-wrap" aria-labelledby="cta-title"><div className="landing-cta"><h2 id="cta-title">Начните с одной ссылки</h2><p>Вставьте первую ссылку — и увидите свой план по дням.</p><a className="landing-button" href="/app?add=1">Собрать курс</a></div></section>
 </main>
 <footer className="landing-container landing-footer"><span className="landing-footer-brand">{BRAND_NAME}</span><a href="/about">О проекте</a><a href="/app?backup=1">Копия прогресса</a></footer>
 </div>}
