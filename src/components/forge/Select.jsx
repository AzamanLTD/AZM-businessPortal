// src/components/forge/Select.jsx
// Forge Select — built on Radix Select
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

export function Select({ value, onValueChange, children, disabled, className = '' }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-surface px-3 py-2 text-sm text-text placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-50 max-h-96 min-w-full overflow-hidden rounded-md border border-line bg-surface-raised shadow-md">
          <SelectPrimitive.Viewport className="p-1">
            {<SelectValuePlaceholder />}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function SelectValue({ placeholder }) {
  return (
    <SelectPrimitive.Value placeholder={placeholder} />
  );
}

function SelectValuePlaceholder() { return null; }

export function SelectItem({ value, children }) {
  return (
    <SelectPrimitive.Item
      value={value}
      className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-text outline-none focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectGroup({ children }) {
  return <SelectPrimitive.Group>{children}</SelectPrimitive.Group>;
}

export function SelectLabel({ children }) {
  return <SelectPrimitive.Label className="py-1.5 pl-2 pr-2 text-xs font-medium text-ink-3">{children}</SelectPrimitive.Label>;
}
