# Day by Day

Personal reading and learning plans: one source material per day, with completion and notes. The Russian interface follows the supplied Khan Academy reference: white header and sidebar, blue actions, teal progress and bordered lesson cards. It is independently branded, not affiliated with Khan Academy. Timers and motivational/decorative copy have been removed.

## Import and daily plans

`POST /api/import` supports British Council course/section URLs, public YouTube playlists, Stepik courses, direct public RSS/Atom feeds and the registered Spotify podcast source. A level URL (e.g. `/free-resources/speaking/b1`) returns actual lessons. A section URL (`/free-resources/speaking`) recursively opens its level pages and flattens their lessons in source order, retaining A1/A2/B1/B2 group labels. It never presents level index pages as daily lessons.

The review dialog supports level selection, title edits, reordering, removing rows and a starting date. Each retained material receives a numbered day and calendar date. Materials are accessible ahead of the plan; missed days do not skip unfinished material.

Production investigation on 2026-10-13 reproduced a 400 response from the deployed import API: British Council did not return a successful HTML response to the server's fetch. To keep known Speaking imports usable, `lib/data/speaking-catalog.json` contains independently fetched and verified title/link snapshots from all four level pages on 2026-10-13 (5 lessons each). Live fetch is tried first; if it fails, only a matching known page uses the dated catalog. The review screen explicitly displays the fallback notice. It is not represented as a live fetch. Unknown blocked URLs still report an error.

Only source titles, links and group labels are stored; source exercises are not copied. YouTube import reads public playlist metadata, follows continuation pages, preserves source order, omits duplicates and unavailable items with a notice, and rejects incomplete responses. Up to 2,000 videos are supported. The two user-supplied playlists were independently fetched on 2026-10-13: 49 Turkish lessons and 1,033 English videos across 11 pages. Their dated title/link catalogs provide a clearly labeled fallback when YouTube refuses server requests. Other sources can be added as manual title/link lists. There is no AI API, unrestricted scraper, login-wall bypass, general scraping or JavaScript-rendering service.

Spotify show pages expose only a small initial group of episodes, so the registered English Galaxy show (`4HQAd7Pw4J1I3gPBCANURe`) is imported from its publisher's official public RSS feed instead. This returns all 300 available episodes in feed order and links each lesson to the publisher's episode page. Unregistered Spotify shows fail with an explicit RSS-support message instead of silently saving a partial list. No Spotify password, token or private feed is used.

Stepik course URLs use the public JSON API to preserve section and unit order. The importer resolves every declared section, unit and lesson and rejects a partial response rather than saving a shorter course. Direct RSS and Atom URLs preserve feed order and clearly say that the result is complete only relative to the current feed; publishers may omit older entries. Public feed fetches reuse DNS and redirect validation and never forward user credentials.

Known dynamic collection pages—including YouTube channels, Apple Podcasts directory pages, SoundCloud sets, Google Drive folders, Vimeo showcases and major login-based course platforms—are not treated as complete generic HTML lists. They return a service-specific instruction to use a playlist, public RSS feed or pasted lesson links. Generic list pages display the number found on the first open page and explicitly mark completeness as unconfirmed.

## Progress and deletion

The original Site origin and `english-morning:v1` localStorage key remain unchanged. Existing notes/completion remain compatible. Course JSON gained optional `planStart` and `importNotice`; Lesson gained optional `group`. The selected collection is persisted separately under `english-morning:active-course` so a newly added B1 collection does not revert to A2 on reload.

Each collection has an accessible delete action, including on mobile. It asks for confirmation mentioning its notes and progress. Deleting the last collection saves a valid empty array and shows an empty state rather than silently reseeding the original course. Other collections are preserved. JSON export is available. Browser deletion clears local data. JSON restore is available from “Копия прогресса”; cross-device sync is not implemented.

## Verification

- TypeScript check and production build pass.
- Automated tests cover completion/undo, out-of-order lessons, reimport preservation, stored-data validation, URL validation, parsing, deleting one/all collections, daily date boundaries, B1 fallback, Speaking expansion, live-HTML expansion, level filtering and refusing unrelated fallback data.
- Before patch: direct authenticated production API request for B1 returned 400.
- After deployment: verify B1 and full Speaking API responses directly on the published origin.
- The design reference was visually inspected in a browser. Automated interaction and visual QA for this app remain unavailable under the supported preview workflow.

No app-level account, timer, reminder or recurring notification is required. Manifest, icons and the service worker support home-screen installation and offline shell caching.

Playbook used from the uploaded archive: README.md; 01-vibecoding/core-workflow.md, verification.md, mistakes.md; 05-ai-assistants/personal-context-system.md; 03-product/ai-process-selection.md.

## Collection order and voice practice

Collections can be reordered with a drag handle (pointer events support mouse/touch), or arrow keys on the focused handle. Mobile has an expandable collection list. Order is persisted in the existing localStorage array; active selection and lesson data remain unchanged. Long review/history lists show 50 materials per page; progress and sidebar lists show a bounded window.

Each lesson supports multiple separately identified voice recordings using MediaRecorder with browser microphone permission. IndexedDB v2 adds a lesson index and migrates v1 recordings without changing their IDs, timestamps or blobs. Each take has its own date, playback, download and delete controls. Audio remains in IndexedDB on the existing origin and can be played, downloaded or deleted. The recorder stops device tracks after recording, errors, or navigation, supports WebM/MP4/Ogg according to browser support, and caps a take at 5 minutes/approximately 20 MB. New takes never overwrite earlier takes. Collection deletion also removes its audio. JSON progress exports do not include audio; use the clip download button. Browser storage clearing removes audio. No transcription, upload, or external AI is used. Actual microphone capture and pointer interaction could not be exercised because supported browser QA is unavailable.

## Import fix (2026-10-13)

The third reported playlist reproduced an HTTP 400 on the published origin: Cloudflare rejects `fetch` with `redirect: 'error'`. This was a runtime configuration bug, not evidence that YouTube denied access. Both YouTube fetches now use `manual`; non-success responses are rejected without following redirects. The reported URL, including its `si` sharing parameter, is canonicalized to its playlist ID. Node live fetch verified all 12 videos in “Марафон похудения 12 тренировок дома”; after deployment the same published API request is checked. The earlier known catalogs remain labeled fallbacks, not the default import path.

Collections support inline renaming on desktop/mobile (pencil → save/Enter, cancel/Escape). Renaming changes only the title, preserving IDs, order, progress, notes and associated audio.

Audio is optional and presented as collapsed “Аудиозаметки” for any subject, including reading and workouts. Expanding the section reveals the recorder and existing clips; collapsing during recording stops and saves the take. Completion never requires an audio note.

## Brand, installable PWA and launch preparation

The generated two-colour infinity mark is stored at `public/brand/day-by-day-loop.png`; optimized header, favicon, Apple and maskable 192/512 PNG variants derive from it. The prompt used ImageGen (built-in): a witty infinity loop inspired by the user’s meme about endless dieting and learning English: turquoise apple joined to an apricot speech bubble with A, on a transparent background. The earlier double-d concept is retained as an unused draft. The Share card uses the same mark.

Fresh visitors start with an empty collection list; existing localStorage is still read under the unchanged key. Install controls handle Chromium's beforeinstallprompt and provide iPhone/Safari instructions. The standalone manifest, safe-area layout and touch targets support home-screen use. App-store submission is not included.

The service worker caches only the public shell and build assets, excluding API, auth and streaming React requests. `scripts/finalize-pwa.mjs` is called by the standard verified build and injects the complete hashed asset list into `dist/client/sw.js`. The shell's marker prevents caching a sign-in page. Cached plans/notes/audio are usable after the first successful connected load. Source content and imports still need internet. New workers activate on subsequent app sessions; no forced reload interrupts recording.

The /about page explains local storage, audio deletion, lack of sync, external sources and optional donations. Open Graph, app icons, robots and sitemap are prepared. Current Sites access remains unchanged until the owner explicitly requests a public audience. No private notes or recordings are included in the public build.

### Donations

Set the non-secret runtime environment variable `DONATION_URL` to the owner's complete HTTPS payment/donation page. `/api/support` returns the validated URL; the support button appears only when configured. A malformed or absent value leaves payments disabled. Payment collection occurs on the external provider; no card data, checkout backend or fake success state exists in this app. The owner currently has no payment link, so donation collection is intentionally inactive.

### Verification limits

Type checking/build and service-worker unit scenarios cover offline navigation, refusing login pages, bypassing imports/auth/RSC, manifest/icon dimensions and donation URL validation. Production route/asset responses are checked after deployment. Supported browser automation is unavailable; physical iPhone/Android installation, offline reopening and microphone capture require device verification.

## Current home and release preparation (2026-10-13)

`/` is the personal dashboard. The marketing landing has been removed. `/plan` remains a compatible planner route, including `?course=<saved ID>` selection. The PWA now starts at `/` while retaining its manifest identity. The Quizlet reference informs the search/cards/continue layout; Khan Academy informs the personal progress strip, course status and clear navigation. Official public help screenshots were inspected because a personal profile is not publicly readable.

The home shows actual saved collections only, next unfinished material, progress per card and current-week activity (Monday–Sunday, device-local calendar). Activity comes from completion timestamps in retained materials, not a permanent event log. Undoing or deleting a completion removes it from the summary. Future timestamps are excluded. The filters separate active/empty collections from completed ones. “Порядок” reuses accessible pointer/touch/keyboard collection controls directly on the home.

“Копия прогресса” downloads and restores JSON, with a preview and explicit restore action. A restored copy adds absent courses and lesson IDs, preserving current titles, notes, completions and ordering. This is additive recovery, not rollback. Existing JSON exports remain compatible. Audio is excluded and can be downloaded from each recording. Invalid/duplicate identities, unsafe links, invalid dates, files over 10 MB and combined limits (30 courses / 2,000 materials per course) are rejected. Restore writes storage before showing success, so quota rejection leaves the visible data unchanged.

The chosen ribbon logo remains in `public/brand/ribbon/`. New empty/error/404 states, skip navigation, reduced-motion styling and touch-sized controls support the main flow. No app-level accounts or simulated achievements were added.

### Release checks

- 54 unit tests: importing, record identity, notes/progress, reordering, backup recovery and rejection, local calendar activity, offline shell and donation configuration.
- TypeScript and standard production build are required before packaging.
- Browser QA is unavailable in this managed environment. Before inviting users, verify at 320/390 px and desktop: add a source, review/save, complete and undo, write a note, reorder/rename/delete, export/restore; then test microphone permissions, install and offline reopening on real iOS/Android.
- Hosting remains owner-private. Public audience changes require the owner's explicit request.
- Donations remain optional and hidden until the owner supplies `DONATION_URL` (see below).

## Vergavi import

Vergavi `/learn` redirects unauthenticated visitors to login. The importer explicitly maps this input to the publicly accessible `/program`, extracts actual linked unit pages in source order and supplies A1/A2 groups to the existing level selector. `/program/a1` and `/program/a2` also work. The preview clearly says one unit per day and that exercises need a Vergavi account; private lesson contents are never fetched or inferred. No unpublished “soon” sections, login links or foreign hosts become lessons. Fetches enforce HTTPS on the exact host, validate every redirect, time out and cap response bytes. Reimport uses stable unit URLs to retain notes and completion.

## Today across collections

The sidebar/mobile “Сегодня” shows one item for each nonempty collection whose start date is not in the future. It keeps a completed-today item checked until local midnight; otherwise it offers the first unfinished material in saved order. Missed days do not pile up or skip materials. Empty collections and courses completed before today are excluded. Completion/undo reuse the same lesson records, and notes open the exact course/lesson. Focus, visibility and a short interval refresh the local day; reload derives the checklist from existing timestamps. Collection-specific `/plan` and deep links remain compatible.

## Quizlet-style header and loop + dot brand

The header uses the requested Quizlet-style arrangement: brand at left, collection dropdown alongside it on wide screens, a wide central search field, add/menu controls at right. Header search opens the saved collection dashboard from any view; duplicate in-page search was removed. Small screens use left-aligned branding and a full-width search row, with fixed content offsets respecting the safe area. Dropdowns expose actual collections, new collection, backup and project information; no simulated account name is shown.

`public/brand/loop-dot/source.png` is the transparent approved blue infinity loop with turquoise dot, extracted through built-in ImageGen from the chosen proof. Prompt: preserve the approved primary symbol and dot gap, remove text/sample icons/background, transparent counters, no redesign. Header, install, favicon, share card, manifest and offline precache use versioned loop-dot assets; prior ribbon assets remain for rollback. Five additional shape variations were generated as previews only, not substituted for the approved mark.

## Logo surface variants

`BrandLogo` preserves the approved transparent loop-dot artwork and uppercase wordmark. `tone="light"` uses navy text and the original colours; `tone="dark"` uses pale text and CSS brightness(1.7) on the mark. `tone="auto"` follows prefers-color-scheme, with explicit ancestor data-theme taking priority. The existing white header explicitly uses light so a dark OS preference cannot produce pale lettering on white. This change does not enable a dark theme for the entire application. `/brand` displays both surface variants, is excluded from indexing, and shares the production component. The adaptive SVG favicon embeds the same asset and responds to browser colour preference, with the existing PNG as fallback. The service-worker build includes the SVG.

Verification: TypeScript, PWA tests, SVG parsing, and contrast calculation on the original mark's dominant opaque blue plus the CSS brightness transformation. Text exceeds 15:1 on both backgrounds; dominant blue is approximately 6:1 on white and 4.9:1 on #111827. These colour calculations are not a substitute for browser or small-size visual QA, which remains unavailable.
