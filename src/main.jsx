import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { applyRealStats, buildAgentPools } from './core/roster.js';
import { App } from './ui/App.jsx';

applyRealStats();
buildAgentPools();

createRoot(document.getElementById('root')).render(<App />);
