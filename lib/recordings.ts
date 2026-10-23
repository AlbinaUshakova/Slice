// Audio stays in IndexedDB on this origin; it is never sent to a server.
export type Recording={key:string;lessonKey:string;courseId:string;blob:Blob;createdAt:string};
export function migrateRecording(value:Omit<Recording,'lessonKey'>&{lessonKey?:string}):Recording{
 return {...value,lessonKey:value.lessonKey??value.key};
}
function database():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('day-by-day-audio',2);
  request.onupgradeneeded=()=>{
   const store=request.result.objectStoreNames.contains('recordings')?request.transaction!.objectStore('recordings'):request.result.createObjectStore('recordings',{keyPath:'key'});
   if(!store.indexNames.contains('courseId'))store.createIndex('courseId','courseId');
   if(!store.indexNames.contains('lessonKey'))store.createIndex('lessonKey','lessonKey');
   // V1 used the lesson key as the record ID. Keep that audio and add the lesson index.
   const cursor=store.openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(row){if(!row.value.lessonKey)row.update(migrateRecording(row.value));row.continue()}};
  };
  request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Storage is busy. Close other tabs.'));request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result)};
 });
}
async function transaction<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('recordings',mode);let result:T;const req=run(tx.objectStore('recordings'));
  req.onsuccess=()=>{result=req.result};tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error??new Error('Couldn’t save the recording.'))};
 });
}
export const recordingKey=(courseId:string,lessonId:string)=>JSON.stringify([courseId,lessonId]);
export function newRecording(courseId:string,lessonId:string,blob:Blob):Recording{
 return {key:crypto.randomUUID(),lessonKey:recordingKey(courseId,lessonId),courseId,blob,createdAt:new Date().toISOString()};
}
export async function getRecordings(lessonKey:string){
 const records=await transaction<Recording[]>('readonly',s=>s.index('lessonKey').getAll(lessonKey));
 return records.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.key.localeCompare(b.key));
}
const deletedCourses=new Set<string>();
const deletedLessons=new Set<string>();
export function beginRecording(courseId:string,lessonId:string){deletedCourses.delete(courseId);deletedLessons.delete(recordingKey(courseId,lessonId));}
export const saveRecording=(value:Recording)=>(deletedCourses.has(value.courseId)||deletedLessons.has(value.lessonKey))?Promise.resolve(undefined):transaction('readwrite',s=>s.put(value));
export const deleteRecording=(key:string)=>transaction('readwrite',s=>s.delete(key));
export async function deleteCourseRecordings(courseId:string){
 deletedCourses.add(courseId);
 const keys=await transaction<IDBValidKey[]>('readonly',s=>s.index('courseId').getAllKeys(courseId));
 await Promise.all(keys.map(key=>transaction('readwrite',s=>s.delete(key))));
}

export async function deleteLessonRecordings(courseId:string,lessonId:string){
 const lessonKey=recordingKey(courseId,lessonId);deletedLessons.add(lessonKey);
 const keys=await transaction<IDBValidKey[]>('readonly',s=>s.index('lessonKey').getAllKeys(lessonKey));
 await Promise.all(keys.map(key=>transaction('readwrite',s=>s.delete(key))));
}
