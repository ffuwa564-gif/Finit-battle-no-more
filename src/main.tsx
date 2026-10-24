import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// itch.io disables document scrolling on its game iframe. Scroll inside the game.
if (window.self !== window.top) document.documentElement.classList.add('is-embedded');
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
