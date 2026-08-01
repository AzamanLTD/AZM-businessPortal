import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'
import { TooltipProvider } from '@/components/forge/Tooltip'
import './styles/forge.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </MotionConfig>
  </React.StrictMode>,
)
