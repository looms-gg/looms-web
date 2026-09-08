import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

export function boot(root: HTMLElement | null = document.getElementById('root')) {
  if (!root) return false
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return true
}

boot()
