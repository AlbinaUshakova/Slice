import {donationUrl} from '@/lib/support';
import {BRAND_NAME} from '@/lib/brand';
export const dynamic='force-dynamic';
export const metadata={title:`About — ${BRAND_NAME}`,description:`How ${BRAND_NAME} works, where your data is stored, and how to install the app.`};
export default function About(){const support=donationUrl(process.env.DONATION_URL);return <main className="about-page">
 <a href="/" className="about-back">← Home</a>
 <img src="/brand/step-flag-app.svg" alt="" width="64" height="64"/>
 <h1>{BRAND_NAME}</h1>
 <p className="about-intro">Your links. One item a day.</p>
 <section><h2>Getting started</h2><p>Add a link to a course, playlist, or article collection. Review the list and save your plan. Open the next item each day, mark it Done, and leave notes.</p><p>If a site does not provide a list, paste lesson links on separate lines — each one becomes a day.</p></section>
 <section><h2>On your phone</h2><p>Tap Install at the bottom of the plan. The app will appear on your home screen.</p><p>After the first visit, plans and notes are available offline. An internet connection is required for new links, articles, and videos.</p></section>
 <section><h2>Storage</h2><p>Collections, progress, and recordings are stored in this browser. They are not synced between devices. Clearing browser data will remove them.</p><p>Progress backup lets you download collections, completion marks, and notes, then restore them on another device. Current items are not overwritten. Audio recordings are downloaded separately.</p></section>
 <details className="about-details"><summary>Data and sources</summary>
  <p>Notes and audio recordings are not sent to the server. The microphone is enabled only with your permission. Deleting a collection also deletes its audio.</p>
  <p>For imports, the server reads a public page and finds titles and links. The list of pasted links is stored in the browser. Private pages and pinned Telegram posts cannot be read automatically.</p>
  <p>Full articles and videos are not stored. Items open on their original sites, where those sites’ rules apply. Import availability may change.</p>
  <p>The app has no advertising or analytics trackers. The hosting provider may process technical request data.</p>
 </details>
 {support&&<section><h2>Support the project</h2><p><a href={support} target="_blank" rel="noopener noreferrer">Make a donation →</a></p><p>All features are free. Donations are optional and payments are handled on an external site. {BRAND_NAME} does not receive bank card details.</p></section>}
</main>}
