import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import { initialEffects } from './hooks/useEffectsSetting.js';
import './styles.css';

document.documentElement.dataset.fx = initialEffects() ? 'on' : 'off';

const container = document.getElementById('root');
const app = <StrictMode><App /></StrictMode>;
// The build prerenders the page into #root. The dev server serves it empty.
if (container.firstElementChild) hydrateRoot(container, app);
else createRoot(container).render(app);
