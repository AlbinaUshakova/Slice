import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchCourse} from '../lib/importer.ts';
import {parseFeed,isFeedUrl} from '../lib/feed.ts';
import {validCourses} from '../lib/course.ts';

const source='https://feeds.learning.org/course.xml';
const rss=`<?xml version="1.0"?><rss><channel><title><![CDATA[Daily English]]></title>
 <item><title>Lesson &amp; One</title><link>https://publisher.org/one</link></item>
 <item><title>Lesson Two</title><link>https://publisher.org/two</link></item></channel></rss>`;
const atom=`<?xml version="1.0"?><feed><title>Design Notes</title>
 <entry><title>First note</title><link rel="alternate" href="https://publisher.org/notes/1"/></entry>
 <entry><title>Second note</title><link href="/notes/2"/></entry></feed>`;
const dns=()=>Response.json({Status:0,Answer:[{type:1,data:'104.21.1.2'}]});

test('RSS and Atom feeds preserve source order and label feed completeness honestly',()=>{
 const one=parseFeed(rss,new URL(source)),two=parseFeed(atom,new URL('https://publisher.org/feed.atom'));
 assert.deepEqual(one.lessons.map(item=>item.title),['Lesson & One','Lesson Two']);
 assert.deepEqual(two.lessons.map(item=>item.url),['https://publisher.org/notes/1','https://publisher.org/notes/2']);
 assert.match(one.importNotice,/older posts may have been removed/);assert.ok(validCourses([one,two]));
});

test('Direct public feed URL imports through DNS-checked manual fetches',async()=>{
 let feedCalls=0;
 const course=await fetchCourse(source,{fetcher:async(url,options)=>{
  if(new URL(url).hostname==='cloudflare-dns.com'){assert.equal(options.redirect,'manual');return dns()}
  feedCalls++;assert.equal(options.redirect,'manual');return new Response(rss,{headers:{'Content-Type':'application/rss+xml'}});
 }});
 assert.equal(feedCalls,1);assert.equal(course.lessons.length,2);assert.equal(course.source,'RSS / Atom');
 assert.equal(isFeedUrl('https://example.org/blog/feed/'),true);assert.equal(isFeedUrl('https://example.org/article'),false);
});

test('Feed import rejects private DNS and non-feed bodies',async()=>{
 let calls=0;
 await assert.rejects(()=>fetchCourse(source,{fetcher:async url=>{
  if(new URL(url).hostname==='cloudflare-dns.com')return Response.json({Status:0,Answer:[{type:1,data:'127.0.0.1'}]});
  calls++;return new Response(rss);
 }}),/public import/);assert.equal(calls,0);
 await assert.rejects(()=>fetchCourse(source,{fetcher:async url=>new URL(url).hostname==='cloudflare-dns.com'?dns():new Response('<html>not feed</html>',{headers:{'Content-Type':'text/html'}})}),/did not return an RSS\/Atom feed/);
});
