import BrandLogo from '../components/BrandLogo';
import {BRAND_NAME} from '@/lib/brand';
export const metadata={title:`Logo — ${BRAND_NAME}`,robots:{index:false,follow:false}};
export default function BrandPreview(){return <main className="brand-preview">
 <a className="brand-preview-back" href="/">← Home</a>
 <h1>One mark. Two themes.</h1>
 <div className="brand-specimens">
  <section className="brand-specimen brand-specimen-light" aria-label="Logo on a light background"><span className="brand-specimen-label">Light</span><BrandLogo tone="light"/></section>
  <section className="brand-specimen brand-specimen-dark" aria-label="Logo on a dark background"><span className="brand-specimen-label">Dark</span><BrandLogo tone="dark"/></section>
 </div>
</main>}
