import { Joyride, STATUS } from 'react-joyride';
import { useEffect, useState, useCallback } from 'react';

const TOUR_STORAGE_KEY = 'azm-bp-tour-completed';

/**
 * Guided product tour (react-joyride), one tour per surface. Steps are
 * declared against stable `data-tour` anchors; at run time each tour is
 * filtered down to the steps whose anchor is actually mounted, so a tour
 * degrades gracefully when a section is hidden (e.g. no revenue chart
 * yet) instead of erroring the whole run.
 */
const tourSteps = {
  dashboard: [
    {
      target: '[data-tour="dashboard-kpis"]',
      content: 'Your key business metrics at a glance — orders, revenue, and fulfillment update in real time.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-revenue"]',
      content: 'Track revenue trends over the last 30 days.',
    },
    {
      target: '[data-tour="rail-nav"]',
      content: 'The rail is your global navigation — switch between orders, bookings, workforce, finance, and marketing tools.',
    },
    {
      target: '[data-tour="notification-bell"]',
      content: 'New orders, messages, and alerts land here.',
    },
  ],
  orders: [
    {
      target: '[data-tour="orders-header"]',
      content: 'Refresh data or switch between the Kanban board and a sortable table here.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="orders-kanban"]',
      content: 'Drag orders between columns to update their status. New orders appear here instantly.',
    },
  ],
  employees: [
    {
      target: '[data-tour="employees-grid"]',
      content: 'Your team — virtualized for smooth scrolling at any size. Click a card for shifts, payroll, and permissions.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="employees-add"]',
      content: 'Add new employees and assign them roles and schedules.',
    },
  ],
};

export function ProductTour({ tourName, run, onClose }) {
  const declared = tourSteps[tourName] || [];
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    if (!run) { setSteps([]); return; }
    // Only keep steps whose anchor is mounted when the tour starts.
    setSteps(declared.filter(s => document.querySelector(s.target)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, tourName]);

  const handleCallback = useCallback((data) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      markTourComplete(tourName);
      onClose?.();
    }
  }, [tourName, onClose]);

  // No anchors mounted (yet) — nothing to tour, don't leave a dangling run.
  useEffect(() => {
    if (run && steps && steps.length === 0) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  if (!steps.length) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      callback={handleCallback}
      showSkipButton
      showProgress
      locale={{ back: 'Back', close: 'Close', last: 'Finish', next: 'Next', skip: 'Skip' }}
      styles={{
        options: {
          primaryColor: 'var(--accent, #6366f1)',
          zIndex: 9999,
        },
        tooltip: {
          borderRadius: '12px',
          background: 'var(--surface, #1e1e2e)',
          color: 'var(--text, #e0e0e0)',
          border: '1px solid var(--line, #333)',
        },
        tooltipContainer: { textAlign: 'left' },
        buttonNext: { borderRadius: '8px' },
        buttonBack: { borderRadius: '8px' },
        buttonSkip: { borderRadius: '8px' },
      }}
    />
  );
}

export function shouldShowTour(tourName) {
  try {
    const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
    return !completed[tourName];
  } catch {
    return true;
  }
}

export function markTourComplete(tourName) {
  try {
    const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
    completed[tourName] = true;
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
  } catch {
    // Storage unavailable — the tour simply re-runs next visit.
  }
}
