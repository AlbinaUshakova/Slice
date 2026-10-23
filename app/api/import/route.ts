import {fetchCourse} from '@/lib/importer';
export async function POST(request: Request) {
 try {
  const raw=await request.text(); if(raw.length>4096)return Response.json({error:'The link is too long.'},{status:400});
  const body=JSON.parse(raw); if(typeof body.url!=='string')return Response.json({error:'Paste a link to a collection.'},{status:400});
  return Response.json(await fetchCourse(body.url),{headers:{'Cache-Control':'no-store'}});
 } catch(error) {
  const message=error instanceof Error && error.name!=='AbortError'?error.message:'The site is taking too long to respond. Try again.';
  return Response.json({error:message},{status:400});
 }
}
