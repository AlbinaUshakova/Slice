'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main className="error-page"><h1>Couldn’t open the page</h1><p>Try again. Your saved collections remain in this browser.</p><button className="button primary" onClick={reset}>Try again</button><a className="button secondary" href="/app">Open the app</a></main>;
}
