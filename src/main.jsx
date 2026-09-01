import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import InstalacaoBitrix from './components/InstalacaoBitrix.jsx';
import './index.css';

// A rota de instalação do Bitrix (#install, ver public/manifest.xml) é decidida
// aqui, na raiz, e não dentro do App: um `return` antes dos hooks do App
// violaria as Rules of Hooks.
const ehInstalacao = window.location.hash === '#install' || window.location.hash === '#/install';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {ehInstalacao ? <InstalacaoBitrix /> : <App />}
  </React.StrictMode>
);
