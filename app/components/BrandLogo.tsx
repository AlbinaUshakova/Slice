import {BRAND_NAME} from '@/lib/brand';
/** Match the containing surface; auto is for surfaces that follow the device theme. */
export default function BrandLogo({tone='auto'}:{tone?:'light'|'dark'|'auto'}) {
 return <span className="brand-lockup" data-tone={tone}>
  <img className="brand-symbol" src="/brand/step-flag.svg" alt="" width="44" height="30"/>
  <span>{BRAND_NAME}</span>
 </span>;
}
