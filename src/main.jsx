import React from 'react'
import ReactDOM from 'react-dom/client'
import { LazyMotion, domAnimation } from 'motion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { TooltipProvider } from '@/components/instrument'
import './styles/instrument.css'
import './styles/studioWaveC.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </LazyMotion>
    </QueryClientProvider>
  </React.StrictMode>,
)
