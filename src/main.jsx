import React from 'react'
import ReactDOM from 'react-dom/client'
import { LazyMotion, domAnimation } from 'motion/react'
import App from './App.jsx'
import { TooltipProvider } from '@/components/forge/Tooltip'
import './styles/forge.css'
import './styles/instrument.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LazyMotion features={domAnimation} strict>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </LazyMotion>
  </React.StrictMode>,
)
