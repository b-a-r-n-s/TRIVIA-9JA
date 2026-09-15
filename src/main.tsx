import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './host.css'
import './hints.css'
import './final-ui.css'
import './final-ui-polish.css'
import './mobile-frame.css'
import './home-reference.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
