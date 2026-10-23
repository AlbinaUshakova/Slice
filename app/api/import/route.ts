import {fetchCourse} from '@/lib/importer';
export async function POST(request: Request) {
 try {
  const raw=await request.text(); if(raw.length>4096)return Response.json({error:'Ссылка слишком длинная.'},{status:400});
  const body=JSON.parse(raw); if(typeof body.url!=='string')return Response.json({error:'Вставь ссылку на подборку.'},{status:400});
  return Response.json(await fetchCourse(body.url),{headers:{'Cache-Control':'no-store'}});
 } catch(error) {
  const message=error instanceof Error && error.name!=='AbortError'?error.message:'Сайт отвечает слишком долго. Попробуй ещё раз.';
  return Response.json({error:message},{status:400});
 }
}
