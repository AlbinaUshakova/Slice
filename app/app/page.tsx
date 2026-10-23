import type {Metadata} from 'next';
import Planner from '../components/Planner';
import {BRAND_NAME} from '@/lib/brand';

export const metadata:Metadata={title:`My plan — ${BRAND_NAME}`,description:'Personal collections, today’s lesson, notes, and progress.'};
export default function AppPage(){return <Planner startView="home"/>}
