import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button';

describe('Instrument Button', () => {
  it('disables interaction and exposes pending state while busy', () => {
    const onClick = vi.fn();
    render(<Button busy onClick={onClick}>Save changes</Button>);

    const button = screen.getByRole('button', { name: 'Save changes' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('data-busy', 'true');

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('preserves explicit disabled state without advertising a false busy state', () => {
    render(<Button disabled>Delete</Button>);

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).not.toHaveAttribute('data-busy');
  });

  it('preserves native submit behavior when a type is explicitly provided', () => {
    render(
      <form>
        <Button type="submit">Submit</Button>
      </form>,
    );

    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
  });
});
