export type Lesson = { id: string; title: string; url: string; completedAt: string | null; note: string; group?: string };
export type Course = { id: string; title: string; source: string; sourceUrl: string; lessons: Lesson[]; planStart?: string; importNotice?: string };
export const COURSE_URL = 'https://learnenglish.britishcouncil.org/free-resources/speaking/a2';
export const STORAGE_KEY = 'english-morning:v1';
export const initialCourse: Course = {
  id: COURSE_URL, title: 'A2 Speaking', source: 'British Council', sourceUrl: COURSE_URL,
  lessons: [
    ['apologising', 'Apologising'], ['giving-instructions', 'Giving instructions'],
    ['showing-interest', 'Showing interest'], ['talking-about-personal-interests', 'Talking about personal interests'],
    ['talking-about-your-job', 'Talking about your job'],
  ].map(([slug,title]) => ({id: `${COURSE_URL}/${slug}`, title, url: `${COURSE_URL}/${slug}`, completedAt:null,note:''}))
};
export const practice: Record<string, { subtitle: string; prompt: string; starters: string[] }> = {
  apologising: {subtitle:'Извиняться — легко', prompt:'Представь: ты случайно разлила кофе друга. Извинись, спроси, всё ли в порядке, и предложи помощь. Затем ответь за друга.', starters:["I’m so sorry…", 'Are you OK?', 'Let me help you.']},
  'giving-instructions': {subtitle:'Объясняй шаг за шагом', prompt:'Объясни другу, как приготовить твой любимый завтрак. Назови четыре простых шага, а затем повтори без подсказок.', starters:['First, you…', 'Then…', 'After that…']},
  'showing-interest': {subtitle:'Поддерживай разговор', prompt:'Расскажи о необычном событии на этой неделе. Представь реакцию собеседника и задай три уточняющих вопроса.', starters:['Really?', 'What happened next?', 'That sounds interesting!']},
  'talking-about-personal-interests': {subtitle:'Расскажи о том, что любишь', prompt:'Расскажи новому знакомому о своих увлечениях: что тебе нравится, как часто ты этим занимаешься и почему.', starters:['I really enjoy…', 'I usually…', 'What about you?']},
  'talking-about-your-job': {subtitle:'Знакомство через работу', prompt:'Расскажи, кем ты работаешь, кому помогаешь и что тебе нравится в работе. Представь, что знакомишься с человеком в путешествии.', starters:['I work as…', 'I help people…', 'I like my job because…']},
};
export function nextLesson(course: Course) { return course.lessons.find(l => !l.completedAt) ?? null; }
export function completeLesson(course: Course, id: string, date: string | null): Course {
  return {...course, lessons:course.lessons.map(l => l.id === id ? {...l,completedAt:date} : l)};
}
export function mergeCourse(existing: Course | undefined, incoming: Course): Course {
  const byId = new Map(existing?.lessons.map(l => [l.id,l]) ?? []);
  const byUrl = new Map(existing?.lessons.map(l => [l.url,l]) ?? []);
  const counts=(lessons:Lesson[])=>{const result=new Map<string,number>();for(const l of lessons)result.set(l.url,(result.get(l.url)??0)+1);return result};
  const oldCounts=counts(existing?.lessons??[]),newCounts=counts(incoming.lessons);
  return {...incoming, planStart:incoming.planStart ?? existing?.planStart, lessons:incoming.lessons.map(l => {
    const old=byId.get(l.id)??(oldCounts.get(l.url)===1&&newCounts.get(l.url)===1?byUrl.get(l.url):undefined);
    return {...l,completedAt:old?.completedAt??null,note:old?.note??''};
  })};
}
export function safeUrl(value: string): boolean { try { const u = new URL(value); return /^https?:$/.test(u.protocol) && !u.username && !u.password; } catch { return false; } }
export function validCourses(value: unknown): value is Course[] {
 if(!Array.isArray(value)||value.length>30)return false;
 const ids=new Set<string>();
 return value.every(c=>{
  if(!c||typeof c!=='object'||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.title!=='string'||typeof c.source!=='string'||typeof c.sourceUrl!=='string'||!safeUrl(c.sourceUrl))return false;
  ids.add(c.id);
  if(c.planStart!==undefined&&(typeof c.planStart!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.planStart)||localDay(new Date(c.planStart+'T12:00:00'))!==c.planStart))return false;
  if(c.importNotice!==undefined&&typeof c.importNotice!=='string')return false;
  if(!Array.isArray(c.lessons)||c.lessons.length>2000)return false;
  const lessons=new Set<string>();
  return c.lessons.every((l:unknown)=>{
   if(!l||typeof l!=='object')return false;
   const item=l as Lesson;
   if(typeof item.id!=='string'||!item.id||lessons.has(item.id)||typeof item.title!=='string'||typeof item.note!=='string'||typeof item.url!=='string'||!safeUrl(item.url))return false;
   lessons.add(item.id);
   return (item.group===undefined||typeof item.group==='string')&&(item.completedAt===null||(typeof item.completedAt==='string'&&Number.isFinite(Date.parse(item.completedAt))));
  });
 });
}

export const ACTIVE_KEY = 'english-morning:active-course';
export function localDay(date=new Date()): string {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function plannedDay(start: string | undefined, index: number): string | null {
 if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
 const date=new Date(start+'T12:00:00'); if(!Number.isFinite(date.getTime()))return null;
 date.setDate(date.getDate()+index); return localDay(date);
}
export function removeCourse(courses: Course[], id: string, active: string) {
 const remaining=courses.filter(c=>c.id!==id);
 return {courses:remaining,active:remaining.some(c=>c.id===active)?active:remaining[0]?.id??''};
}
export function reorderCourses(courses:Course[],id:string,targetId:string):Course[]{
 const from=courses.findIndex(c=>c.id===id),to=courses.findIndex(c=>c.id===targetId);
 if(from<0||to<0||from===to)return courses;
 const reordered=[...courses];const [item]=reordered.splice(from,1);reordered.splice(to,0,item);return reordered;
}
