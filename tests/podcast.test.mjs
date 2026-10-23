import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchCourse} from '../lib/importer.ts';
import {parsePodcastFeed,spotifyShowUrl} from '../lib/podcast.ts';
import {validCourses} from '../lib/course.ts';

const spotify='https://open.spotify.com/show/4HQAd7Pw4J1I3gPBCANURe';
const rss=`<?xml version="1.0"?><rss><channel>
 <title><![CDATA[Английский & язык]]></title>
 <item><title><![CDATA[Урок 1. It&apos;s easy]]></title><link>https://englishgalaxy.mave.digital/ep-1</link><guid>one</guid></item>
 <item><title>Урок &#50;</title><link><![CDATA[https://englishgalaxy.mave.digital/ep-2]]></link><guid>two</guid></item>
 <item><title>Повтор</title><link>https://englishgalaxy.mave.digital/ep-2</link><guid>duplicate</guid></item>
</channel></rss>`;

test('Spotify show URLs canonicalize and reject unsafe or unrelated addresses',()=>{
 assert.equal(spotifyShowUrl(spotify+'?si=tracking').href,spotify);
 for(const bad of ['http://open.spotify.com/show/4HQAd7Pw4J1I3gPBCANURe','https://open.spotify.com.evil.test/show/4HQAd7Pw4J1I3gPBCANURe','https://user@open.spotify.com/show/4HQAd7Pw4J1I3gPBCANURe','https://open.spotify.com/episode/4HQAd7Pw4J1I3gPBCANURe'])assert.throws(()=>spotifyShowUrl(bad));
});

test('Podcast RSS parser preserves feed order, decodes titles and removes duplicates',()=>{
 const course=parsePodcastFeed(rss,new URL(spotify));
 assert.equal(course.title,'Английский & язык');
 assert.deepEqual(course.lessons.map(lesson=>lesson.title),["Урок 1. It's easy",'Урок 2']);
 assert.deepEqual(course.lessons.map(lesson=>lesson.url),['https://englishgalaxy.mave.digital/ep-1','https://englishgalaxy.mave.digital/ep-2']);
 assert.match(course.importNotice,/2 episodes/);assert.ok(validCourses([course]));
});

test('Known Spotify show imports its complete official RSS feed instead of the visible page',async()=>{
 let calls=0;
 const course=await fetchCourse(spotify+'?si=f9619bc849cf4fc8',{fetcher:async(input,options)=>{
  calls++;assert.equal(String(input),'https://cloud.mave.digital/50251');assert.equal(options.redirect,'manual');
  return new Response(rss,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
 }});
 assert.equal(calls,1);assert.equal(course.id,spotify);assert.equal(course.source,'Spotify · RSS');assert.equal(course.lessons.length,2);
});

test('Unknown Spotify shows fail clearly instead of silently importing a partial page',async()=>{
 await assert.rejects(()=>fetchCourse('https://open.spotify.com/show/1234567890123456789012'),/official public RSS feed/);
});
