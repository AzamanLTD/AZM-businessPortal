import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function Broken() {
  throw new Error('render failure');
}

describe('ErrorBoundary recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears only portal session storage when signing in again', () => {
    localStorage.setItem('biz_user', '{"id":1}');
    localStorage.setItem('admin_selected_biz', 'biz-1');
    localStorage.setItem('theme_preference', 'dark');

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    fireEvent.click(screen.getByRole('button', { name: 'Sign In Again' }));

    expect(localStorage.getItem('biz_user')).toBeNull();
    expect(localStorage.getItem('admin_selected_biz')).toBeNull();
    expect(localStorage.getItem('theme_preference')).toBe('dark');
  });
});
