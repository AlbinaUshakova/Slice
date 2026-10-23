import BrandLogo from '../components/BrandLogo';
export const metadata={title:'Логотип — Day by Day',robots:{index:false,follow:false}};
export default function BrandPreview(){return <main className="brand-preview">
 <a className="brand-preview-back" href="/">← Главная</a>
 <h1>Один знак. Две темы.</h1>
 <div className="brand-specimens">
  <section className="brand-specimen brand-specimen-light" aria-label="Логотип на светлом фоне"><span className="brand-specimen-label">Светлая</span><BrandLogo tone="light"/></section>
  <section className="brand-specimen brand-specimen-dark" aria-label="Логотип на тёмном фоне"><span className="brand-specimen-label">Тёмная</span><BrandLogo tone="dark"/></section>
 </div>
</main>}
