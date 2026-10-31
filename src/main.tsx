import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './ui/moonlit-theme.css';
// itch.io disables document scrolling on its game iframe. Scroll inside the game.
if (window.self !== window.top) document.documentElement.classList.add('is-embedded');
const root = document.getElementById('root')!;
root.dataset.gameSurface = 'true';
ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
