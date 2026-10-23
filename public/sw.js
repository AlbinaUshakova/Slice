/* Day by Day: only the public app shell and static assets are cached, never imports or recordings. */
const CACHE='day-by-day-__BUILD_ID__';
const PRECACHE=/* PRECACHE */[];
const PAGES=new Set(['/','/plan','/about']);
async function shell(path){
 const response=await fetch(path,{cache:'reload',redirect:'manual',headers:{Accept:'text/html'}});
 if(!response.ok||response.redirected||!response.headers.get('content-type')?.includes('text/html'))return null;
 const html=await response.clone().text();
 if(!html.includes('day-by-day-shell'))return null;
 const cache=await caches.open(CACHE);await cache.put(path,response.clone());return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(PRECACHE);
 await Promise.allSettled([...PAGES].map(shell));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('day-by-day-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 // Login, API and streaming React responses must always reach the network.
 if(url.pathname.startsWith('/api/')||url.pathname.includes('chatgpt')||url.pathname==='/callback'||req.headers.get('RSC')==='1'||url.searchParams.has('_rsc'))return;
 if(req.mode==='navigate'&&PAGES.has(url.pathname)){
  event.respondWith((async()=>{
   try{const response=await fetch(req);if(response.ok&&!response.redirected&&response.headers.get('content-type')?.includes('text/html')){const text=await response.clone().text();if(text.includes('day-by-day-shell')){const cache=await caches.open(CACHE);await cache.put(url.pathname,response.clone())}}return response}
   catch{return await caches.match(url.pathname)??await caches.match('/offline.html')??new Response('Нет подключения',{status:503})}
  })());return;
 }
 if(url.pathname.startsWith('/_next/static/')||PRECACHE.includes(url.pathname))event.respondWith((async()=>{
  const cached=await caches.match(req);if(cached)return cached;
  const response=await fetch(req);if(response.ok&&!response.redirected&&response.type==='basic'){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}return response;
 })());
});
