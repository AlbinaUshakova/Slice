'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main className="error-page"><h1>Не удалось открыть страницу</h1><p>Попробуй ещё раз. Сохранённые подборки остаются в этом браузере.</p><button className="button primary" onClick={reset}>Попробовать снова</button><a className="button secondary" href="/app">В приложение</a></main>;
}
