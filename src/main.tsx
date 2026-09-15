import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './ui-overhaul.css'
import './legacy-home-fix.css'
import App from './AppRebuild'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
