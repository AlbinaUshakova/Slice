'use client';
import {useState} from 'react';
import {BookOpen} from 'lucide-react';

function youtubeVideoId(value:string):string|null {
 try{
  const url=new URL(value);
  if(url.hostname==='youtu.be')return /^[-\w]{11}$/.test(url.pathname.slice(1))?url.pathname.slice(1):null;
  if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(url.hostname)){
   const id=url.searchParams.get('v')??/^\/shorts\/([-\w]{11})/.exec(url.pathname)?.[1]??null;
   return id&&/^[-\w]{11}$/.test(id)?id:null;
  }
 }catch{/* Invalid links are rejected when a course is saved. */}
 return null;
}

function sourceHost(value:string):string {
 try{return new URL(value).hostname.replace(/^www\./,'')}catch{return ''}
}

function favicon(value:string):string|null {
 try{return new URL('/favicon.ico',value).href}catch{return null}
}

export default function SourceArtwork({lessonUrl,sourceUrl,source,compact=false}:{lessonUrl:string;sourceUrl:string;source:string;compact?:boolean}){
 const videoId=youtubeVideoId(lessonUrl),host=sourceHost(sourceUrl||lessonUrl);
 const spotify=host==='open.spotify.com';
 const image=videoId?`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`:spotify?`/api/artwork?url=${encodeURIComponent(sourceUrl)}`:favicon(sourceUrl||lessonUrl);
 const [failedImage,setFailedImage]=useState<string|null>(null),failed=!image||failedImage===image;
 return <div className={'source-artwork '+(videoId?'source-artwork-video ':'source-artwork-logo ')+(compact?'source-artwork-compact':'')} role="img" aria-label={`Источник урока: ${source||host||'сайт'}`}>
  {!failed?<img key={image} src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailedImage(image)}/>:<BookOpen size={compact?34:46} aria-hidden="true"/>}
 </div>;
}
