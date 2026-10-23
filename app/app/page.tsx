import type {Metadata} from 'next';
import Planner from '../components/Planner';
import {BRAND_NAME} from '@/lib/brand';

export const metadata:Metadata={title:`Мой план — ${BRAND_NAME}`,description:'Личные подборки, урок на сегодня, заметки и прогресс.'};
export default function AppPage(){return <Planner startView="home"/>}
