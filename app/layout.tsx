import type { Metadata, Viewport } from 'next';
import './globals.css';
import './brand.css';
import {BRAND_NAME} from '@/lib/brand';
export const metadata: Metadata = {
 title:`${BRAND_NAME} — interesting things, step by step`,
 description:'Articles, videos, and courses in one route. Your next item, notes, and progress — every day, at your own pace.',
 icons:{icon:[{url:'/brand/step-flag.svg',type:'image/svg+xml',sizes:'any'}],apple:'/brand/loop-dot/apple-touch-icon.png'},
 metadataBase:new URL('https://my-day-by-day.vercel.app'),
 openGraph:{title:BRAND_NAME,description:'Articles, videos, and workouts — one item a day.',images:[{url:'/brand/loop-dot/share-card.png',width:1200,height:630}],locale:'en_US',type:'website'},
 twitter:{card:'summary_large_image',title:BRAND_NAME,images:['/brand/loop-dot/share-card.png']},
 other:{'day-by-day-shell':'1'},
 appleWebApp:{capable:true,title:BRAND_NAME,statusBarStyle:'default'},
};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#ffffff'};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;700;900&display=swap" rel="stylesheet"/><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head><body>{children}</body></html>;}
