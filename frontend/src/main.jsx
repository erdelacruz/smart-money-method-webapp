// ============================================================
// main.jsx — Application bootstrap file.
//
// This is the first JavaScript file executed by the browser.
// Its only job is to mount the React component tree onto the DOM.
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client'; // React 18 uses the new "root" API
import App from './App';
import './index.css'; // Global stylesheet imported once here so it applies everywhere

const rootElement = document.getElementById('root');
if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(
    rootElement,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
