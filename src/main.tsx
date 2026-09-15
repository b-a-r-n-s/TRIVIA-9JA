import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './reference-final.css'
import App from './AppRebuild'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
