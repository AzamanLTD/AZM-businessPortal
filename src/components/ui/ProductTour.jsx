import { Joyride, STATUS } from 'react-joyride';
import { useState, useCallback } from 'react';

const TOUR_STORAGE_KEY = 'azm-bp-tour-completed';

const tourSteps = {
  dashboard: [
    {
      target: '[data-tour="dashboard-stats"]',
      content: 'Your key business metrics at a glance — revenue, orders, and active customers update in real time.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-charts"]',
      content: 'Track trends over time. Switch between daily, weekly, and monthly views.',
    },
    {
      target: '[data-tour="sidebar-nav"]',
      content: 'Navigate between all your business tools — orders, storefront, employees, finance, and more.',
    },
    {
      target: '[data-tour="notification-bell"]',
      content: 'Stay on top of new orders, messages, and alerts here.',
    },
  ],
  orders: [
    {
      target: '[data-tour="orders-kanban"]',
      content: 'Drag orders between columns to update their status. New orders appear here instantly.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="orders-filter"]',
      content: 'Filter orders by date, status, or search by customer name.',
    },
  ],
  employees: [
    {
      target: '[data-tour="employees-grid"]',
      content: 'Manage your team — view shifts, payroll, and time-off requests.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="employees-add"]',
      content: 'Add new employees and assign them roles and schedules.',
    },
  ],
  finance: [
    {
      target: '[data-tour="finance-invoices"]',
      content: 'Create and track invoices. Paid invoices are highlighted automatically.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="finance-payroll"]',
      content: 'Run payroll for your employees with one click.',
    },
  ],
  reservations: [
    {
      target: '[data-tour="reservations-calendar"]',
      content: 'View and manage bookings in calendar or list format.',
      disableBeacon: true,
    },
  ],
};

export function ProductTour({ tourName, run, onClose }) {
  const steps = tourSteps[tourName] || [];

  const handleCallback = useCallback((data) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
        ...JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}'),
        [tourName]: true,
      }));
      onClose?.();
    }
  }, [tourName, onClose]);

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
          primaryColor: 'var(--f-tint-color)',
          zIndex: 9999,
        },
        tooltip: {
          borderRadius: '12px',
          background: 'var(--f-surface-sunken)',
          color: 'var(--f-text)',
          border: '1px solid var(--f-line)',
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
  const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
  return !completed[tourName];
}

export function markTourComplete(tourName) {
  const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
  completed[tourName] = true;
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
}
