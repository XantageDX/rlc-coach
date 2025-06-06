import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/auth.css';
// import './styles/projects.css';
import './styles/modals.css';
import './styles/board.css';
import './styles/details.css';
import './styles/core-hypothesis.css';
import './styles/report-writer.css';
import './styles/archive.css';
import './styles/brandColors.css';
import './styles/sidebar.css';
import './styles/layout.css';
import './styles/dashboard.css';
import './components/common/MarkdownRenderer.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
