import React from 'react'
import ReactDOM from 'react-dom/client'
import { LazyMotion, domAnimation } from 'motion/react'
import App from './App.jsx'
import { TooltipProvider } from '@/components/instrument'
import './styles/instrument.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LazyMotion features={domAnimation} strict>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </LazyMotion>
  </React.StrictMode>,
)
