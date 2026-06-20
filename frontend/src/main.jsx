import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// index.css is intentionally excluded — global styles are loaded via style.css in index.html
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
