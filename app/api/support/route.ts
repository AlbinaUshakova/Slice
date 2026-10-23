import {donationUrl} from '@/lib/support';
export async function GET(){return Response.json({url:donationUrl(process.env.DONATION_URL)},{headers:{'Cache-Control':'no-store'}})}
