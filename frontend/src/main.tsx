import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

// 全局错误兜底：防止未捕获异常导致白屏
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled Promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[Global] Uncaught error:', event.error);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
