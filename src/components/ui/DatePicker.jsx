import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export function DatePicker({ value, onChange, label, placeholder = 'Select date', className }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectedDate = value ? new Date(value) : null;
  const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className={cn('relative', className)}>
      {label && <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-1.5 block">{label}</label>}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)] text-[var(--f-text)] text-sm flex items-center gap-2 hover:border-[var(--f-tint-color)] transition-colors"
      >
        <Calendar className="w-4 h-4 text-[var(--f-text-3)]" />
        {value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 p-4 rounded-xl border border-[var(--f-line)] shadow-2xl" style={{ background: 'var(--f-surface)' }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded-lg hover:bg-[var(--f-surface-sunken)] text-[var(--f-text-3)]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-[var(--f-text)]">{months[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded-lg hover:bg-[var(--f-surface-sunken)] text-[var(--f-text-3)]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map(d => <span key={d} className="text-[10px] text-center text-[var(--f-text-3)] font-medium">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = new Date(year, month, i + 1);
              const isToday = isSameDay(date, new Date());
              const isSelected = isSameDay(date, selectedDate);
              return (
                <button
                  key={i}
                  onClick={() => { onChange(date.toISOString()); setOpen(false); }}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-[var(--f-tint-color)] text-[var(--f-bg)]'
                      : isToday
                        ? 'bg-[var(--f-surface-sunken)] text-[var(--f-tint-color)] border border-[var(--f-tint-color)]'
                        : 'text-[var(--f-text-3)] hover:bg-[var(--f-surface-sunken)]'
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
