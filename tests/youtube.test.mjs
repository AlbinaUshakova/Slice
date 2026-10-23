import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchCourse} from '../lib/importer.ts';
import {parseYoutube,playlistUrl} from '../lib/youtube.ts';
import {validCourses,plannedDay,mergeCourse,completeLesson} from '../lib/course.ts';
const id='PLssRXZAfmWU510niYlySaZnOLHwj2jTUP',url='https://www.youtube.com/playlist?list='+id;
const video=(videoId,title)=>({playlistVideoRenderer:{videoId,title:{runs:[{text:title}]},isPlayable:true}});
const doc=(items,count=items.length)=>`<script>var ytInitialData = ${JSON.stringify({metadata:{playlistMetadataRenderer:{title:'Course'}},header:{playlistHeaderRenderer:{numVideosText:{simpleText:String(count)}}},contents:{items}})};</script><script>{"INNERTUBE_CLIENT_VERSION":"2.test"}</script>`;
test('YouTube URLs canonicalize and reject credentials, disguised hosts and non-playlists',()=>{
 assert.equal(playlistUrl('https://m.youtube.com/watch?v=P8Mad3Z1rNw&list='+id+'&si=tracking').href,url);
 for(const bad of ['https://youtube.com.evil.test/playlist?list='+id,'https://user@www.youtube.com/playlist?list='+id,'https://www.youtube.com/watch?v=P8Mad3Z1rNw','http://www.youtube.com/playlist?list='+id])assert.throws(()=>playlistUrl(bad));
});
test('Current lockup metadata imports only playlist members, preserving source order and quoted titles',()=>{
 const modern=(videoId,title,playlistId)=>({lockupViewModel:{contentType:'LOCKUP_CONTENT_TYPE_VIDEO',contentId:videoId,metadata:{lockupMetadataViewModel:{title:{content:title}}},rendererContext:{watchEndpoint:{playlistId}}}});
 const c=parseYoutube(doc([modern('P8Mad3Z1rNw','Вводный "урок" }',id),modern('abcdefghijk','Recommendation','PLother'),modern('12345678901','Урок 1',id)],2),playlistUrl(url)).course;
 assert.deepEqual(c.lessons.map(l=>l.title),['Вводный "урок" }','Урок 1']);assert.ok(validCourses([c]));
});
test('Pagination joins actual videos in order and never requests a source-provided host',async()=>{
 let calls=0;
 const c=await fetchCourse('https://www.youtube.com/playlist?list=PLtest1234567890',{fetcher:async(input,init)=>{
  calls++;
  if(calls===1)return new Response(doc([video('P8Mad3Z1rNw','First'),{continuationItemRenderer:{continuationEndpoint:{continuationCommand:{token:'page2'}}}}],2));
  assert.equal(input,'https://www.youtube.com/youtubei/v1/browse');assert.equal(JSON.parse(init.body).continuation,'page2');
  return Response.json({onResponseReceivedActions:[{appendContinuationItemsAction:{continuationItems:[video('12345678901','Second')]}}]});
 }});
 assert.equal(calls,2);assert.deepEqual(c.lessons.map(l=>l.title),['First','Second']);
});
test('Partial or private unknown playlists fail instead of silently saving an incomplete plan',async()=>{
 const other='https://www.youtube.com/playlist?list=PLtest1234567890';
 await assert.rejects(()=>fetchCourse(other,{fetcher:async()=>new Response(doc([video('P8Mad3Z1rNw','First')],49))}),/часть/);
 await assert.rejects(()=>fetchCourse(other,{fetcher:async()=>new Response('Forbidden',{status:403})}));
});
test('Verified user playlist fallback creates 49 dated days and reimport retains practice notes',async()=>{
 const c=await fetchCourse(url,{fetcher:async()=>new Response('Forbidden',{status:403})});
 assert.equal(c.lessons.length,49);assert.match(c.lessons[0].title,/Вводный/);assert.match(c.lessons.at(-1).title,/Урок 48/);assert.match(c.importNotice,/13\.10\.2026/);
 assert.equal(plannedDay('2026-10-13',48),'2026-11-30');
 const old=completeLesson(c,c.lessons[0].id,'2026-10-13T08:00:00Z');old.lessons[0].note='Моя практика';
 assert.equal(mergeCourse(old,c).lessons[0].note,'Моя практика');assert.ok(validCourses(JSON.parse(JSON.stringify([c]))));
});
test('Large user playlist imports all 1033 videos instead of the first 100',async()=>{
 const c=await fetchCourse('https://www.youtube.com/playlist?list=PLD6SPjEPomaustGSgYNsn3V62BTQeH85X',{fetcher:async()=>new Response('Forbidden',{status:403})});
 assert.equal(c.lessons.length,1033);assert.ok(validCourses([c]));assert.equal(new URL(c.lessons[0].url).searchParams.get('v'),'Hp9wUEDasY4');assert.equal(new URL(c.lessons.at(-1).url).searchParams.get('v'),'yT-Tlhe7hKk');
});
test('Modern nested continuation commands are followed',async()=>{
 let calls=0;
 const c=await fetchCourse('https://www.youtube.com/playlist?list=PLtest1234567890',{fetcher:async()=>{
  calls++;return calls===1?new Response(doc([video('P8Mad3Z1rNw','First'),{continuationItemViewModel:{continuationCommand:{innertubeCommand:{continuationCommand:{token:'nested'}}}}}],2)):Response.json({onResponseReceivedActions:[{appendContinuationItemsAction:{continuationItems:[video('12345678901','Second')]}}]});
 }});assert.equal(calls,2);assert.equal(c.lessons.length,2);
});
test('Import uses edge-supported manual redirects for initial and continuation requests',async()=>{
 let calls=0;
 const c=await fetchCourse('https://youtube.com/playlist?list=PLiSkEduwqnWuML6iA7ugsOy8hjJT9ycei&si=6mOoCS0JhaYKJu3I',{fetcher:async(input,options)=>{
  assert.equal(options.redirect,'manual','Cloudflare does not support redirect:error');calls++;
  if(calls===1){assert.equal(String(input),'https://www.youtube.com/playlist?list=PLiSkEduwqnWuML6iA7ugsOy8hjJT9ycei&hl=ru');return new Response(doc([video('GfoVw_HQgmI','День 1'),{continuationCommand:{token:'more'}}],2))}
  return Response.json({onResponseReceivedActions:[{appendContinuationItemsAction:{continuationItems:[video('nB9d8T1Q51w','День 12')]}}]});
 }});
 assert.equal(calls,2);assert.equal(c.lessons.length,2);assert.equal(c.importNotice,undefined);
});
test('Manual redirects are never followed to arbitrary destinations',async()=>{
 let calls=0;await assert.rejects(()=>fetchCourse('https://youtube.com/playlist?list=PLiSkEduwqnWuML6iA7ugsOy8hjJT9ycei',{fetcher:async()=>{calls++;return new Response(null,{status:302,headers:{Location:'http://127.0.0.1/'}})}}));assert.equal(calls,1);
});
