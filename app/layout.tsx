import type { Metadata, Viewport } from 'next';
import './globals.css';
import './brand.css';
export const metadata: Metadata = {
 title:'Day by Day — интересное, шаг за шагом',
 description:'Статьи, видео и курсы в одном маршруте. Следующий материал, заметки и прогресс — каждый день в своём темпе.',
 icons:{icon:[{url:'/brand/loop-dot/favicon.png',type:'image/png',sizes:'64x64'},{url:'/brand/loop-dot/favicon-adaptive.svg',type:'image/svg+xml',sizes:'any'}],apple:'/brand/loop-dot/apple-touch-icon.png'},
 metadataBase:new URL('https://english-morning-albi.devochka-name.chatgpt.site'),
 openGraph:{title:'Day by Day',description:'Статьи, видео и тренировки — один материал в день.',images:[{url:'/brand/loop-dot/share-card.png',width:1200,height:630}],locale:'ru_RU',type:'website'},
 twitter:{card:'summary_large_image',title:'Day by Day',images:['/brand/loop-dot/share-card.png']},
 other:{'day-by-day-shell':'1'},
 appleWebApp:{capable:true,title:'Day by Day',statusBarStyle:'default'},
};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#ffffff'};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="ru"><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head><body>{children}</body></html>;}
