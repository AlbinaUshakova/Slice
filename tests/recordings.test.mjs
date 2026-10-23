import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordingKey,newRecording,migrateRecording} from '../lib/recordings.ts';
test('Each take has its own identity but remains attached to the same lesson',()=>{
 const blob=new Blob(['voice'],{type:'audio/webm'});
 const a=newRecording('course','lesson',blob),b=newRecording('course','lesson',blob);
 assert.notEqual(a.key,b.key);assert.equal(a.lessonKey,b.lessonKey);assert.equal(a.lessonKey,recordingKey('course','lesson'));
 assert.notEqual(a.lessonKey,newRecording('course','another',blob).lessonKey);
 assert.notEqual(a.lessonKey,newRecording('another','lesson',blob).lessonKey);
});
test('V1 migration preserves original audio, record ID and timestamp',async()=>{
 const old={key:recordingKey('course','lesson'),courseId:'course',blob:new Blob(['existing audio']),createdAt:'2026-10-13T05:00:00Z'};
 const migrated=migrateRecording(old);assert.equal(migrated.key,old.key);assert.equal(migrated.lessonKey,old.key);assert.equal(migrated.blob,old.blob);assert.equal(migrated.createdAt,old.createdAt);assert.equal(await migrated.blob.text(),'existing audio');
 assert.deepEqual(migrateRecording(migrated),migrated);assert.equal(old.lessonKey,undefined);
});
