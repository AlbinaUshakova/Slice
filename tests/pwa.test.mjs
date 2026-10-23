import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {donationUrl} from '../lib/support.ts';
const source=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(network){
 const handlers={},stored=new Map();let active='';
 const key=input=>typeof input==='string'?new URL(input,'https://site.test').pathname:new URL(input.url).pathname;
 const cache={addAll:async()=>{},put:async(k,r)=>stored.set(key(k),r.clone())};
 const context={URL,Response,Set,Promise,fetch:network,caches:{open:async name=>{active=name;return cache},match:async k=>stored.get(key(k))?.clone(),keys:async()=>[active],delete:async()=>true},self:{location:{origin:'https://site.test'},clients:{claim:async()=>{}},addEventListener:(name,handler)=>handlers[name]=handler}};
 vm.runInNewContext(source,context);
 return {stored,async install(){let promise;handlers.install({waitUntil:p=>promise=p});await promise},async request(path,{method='GET',mode='navigate',rsc=false}={}){let result;handlers.fetch({request:{url:'https://site.test'+path,method,mode,headers:new Headers(rsc?{RSC:'1'}:{})},respondWith:p=>result=p});return result?await result:null}};
}
test('Offline navigation restores the cached app shell; API and React streaming requests are never cached',async()=>{
 let connected=true;const w=worker(async()=>{if(!connected)throw new Error('offline');return new Response('<meta name="day-by-day-shell" content="1">Saved app',{headers:{'content-type':'text/html'}})});
 await w.install();connected=false;
 assert.match(await (await w.request('/')).text(),/Saved app/);
 assert.match(await (await w.request('/plan')).text(),/Saved app/);
 assert.equal(await w.request('/api/import',{method:'POST'}),null);
 assert.equal(await w.request('/api/support'),null);
 assert.equal(await w.request('/?_rsc=123',{rsc:true}),null);
 assert.equal(await w.request('/signin-with-chatgpt'),null);
});
test('Login pages and redirects are not saved as an offline app',async()=>{
 for(const response of [new Response('<h1>Sign in</h1>',{headers:{'content-type':'text/html'}}),new Response(null,{status:302,headers:{Location:'/signin-with-chatgpt'}})]){
  const w=worker(async()=>response.clone());await w.install();assert.equal(w.stored.size,0);
 }
});
test('Install manifest includes standalone launch and valid 192/512 app icons',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/app');
 for(const size of [192,512]){
  const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`);assert.ok(icon);
  const data=fs.readFileSync(new URL('../public'+icon.src,import.meta.url));assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);
 }
});
test('Donations remain disabled until a valid HTTPS payment link is configured',()=>{
 for(const value of [undefined,'','javascript:alert(1)','http://pay.example','https://user:password@pay.example'])assert.equal(donationUrl(value),null);
 assert.equal(donationUrl('https://pay.example/albi'),'https://pay.example/albi');
});
