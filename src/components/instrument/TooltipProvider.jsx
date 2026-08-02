import { createContext, useContext } from 'react';

const TooltipCtx = createContext(null);

export function TooltipProvider({ children }) {
  return <TooltipCtx.Provider value={{ enabled: true }}>{children}</TooltipCtx.Provider>;
}

export function useTooltipContext() {
  return useContext(TooltipCtx);
}
