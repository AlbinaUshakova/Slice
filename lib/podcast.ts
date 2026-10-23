import type {Course} from './course';
import {parseFeed} from './feed.ts';

const SPOTIFY_HOST='open.spotify.com';
const SPOTIFY_FEEDS:Record<string,string>={
 '4HQAd7Pw4J1I3gPBCANURe':'https://cloud.mave.digital/50251',
};
const MAX_FEED_BYTES=4_000_000;

export function isSpotify(value:string):boolean {
 try{return new URL(value).hostname.toLowerCase()===SPOTIFY_HOST}catch{return false}
}

export function spotifyShowUrl(value:string):URL {
 let url:URL;try{url=new URL(value)}catch{throw new Error('Paste a link to a Spotify podcast.')}
 const match=/^\/show\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
 if(url.protocol!=='https:'||url.hostname.toLowerCase()!==SPOTIFY_HOST||url.port||url.username||url.password||!match)
  throw new Error('A public Spotify podcast link is required.');
 return new URL(`https://${SPOTIFY_HOST}/show/${match[1]}`);
}

export function parsePodcastFeed(xml:string,source:URL):Course {
 const course=parseFeed(xml,source,{sourceName:'Spotify · RSS'});
 return {...course,importNotice:`Loaded from the official public RSS feed: ${course.lessons.length} episodes. Links open the publisher’s episode pages.`};
}

function knownFeed(source:URL):URL {
 const id=source.pathname.split('/').at(-1)??'';const value=SPOTIFY_FEEDS[id];
 if(!value)throw new Error('Spotify shows only some episodes. An official public RSS feed has not yet been found for this podcast.');
 return new URL(value);
}

function validFeedRedirect(value:string,base:URL):URL {
 const url=new URL(value,base);
 if(url.protocol!=='https:'||url.hostname!==base.hostname||url.port||url.username||url.password)
  throw new Error('The RSS feed redirected to an unsupported address.');
 return url;
}

async function readFeed(response:Response):Promise<string> {
 if(!response.ok)throw new Error('Couldn’t open the podcast RSS feed. Try again later.');
 if(!/\b(?:application|text)\/(?:rss\+xml|xml)\b/i.test(response.headers.get('content-type')??''))
  throw new Error('The source did not return an RSS feed.');
 const reader=response.body?.getReader();if(!reader)throw new Error('The RSS feed is empty.');
 const decoder=new TextDecoder();let xml='',bytes=0;
 while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;
  if(bytes>MAX_FEED_BYTES){await reader.cancel();throw new Error('The RSS feed is too large.');}
  xml+=decoder.decode(part.value,{stream:true});
 }
 return xml+decoder.decode();
}

export async function fetchSpotify(value:string,fetcher:typeof fetch=fetch):Promise<Course> {
 const source=spotifyShowUrl(value);let feed=knownFeed(source);
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  for(let redirects=0;redirects<4;redirects++){
   const response=await fetcher(feed,{redirect:'manual',signal:controller.signal,headers:{Accept:'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8','User-Agent':'DayByDay/1.0 (podcast course organizer)'}});
   if(response.status>=300&&response.status<400){
    const location=response.headers.get('location');await response.body?.cancel();
    if(!location)throw new Error('The RSS feed returned an empty redirect.');
    feed=validFeedRedirect(location,feed);continue;
   }
   return parsePodcastFeed(await readFeed(response),source);
  }
  throw new Error('Too many RSS feed redirects.');
 }catch(error){
  if(error instanceof Error&&error.name==='AbortError')throw new Error('The RSS feed is taking too long to respond. Try again.');
  throw error;
 }finally{clearTimeout(timeout)}
}
