import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import Button from '@mui/material/Button';
import { getTheme } from '../../theme';
import { EmptyState } from './EmptyState';

const wrap = (ui: React.ReactElement) => (
  <ThemeProvider theme={getTheme('mocha')}>{ui}</ThemeProvider>
);

describe('EmptyState', () => {
  it('renders title and subtitle', () => {
    render(wrap(<EmptyState title="No reviews yet" subtitle="Be the first to rate." />));
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to rate.')).toBeInTheDocument();
  });

  it('fires CTA onClick', () => {
    const handleClick = vi.fn();
    render(
      wrap(
        <EmptyState
          title="No tickets"
          action={<Button onClick={handleClick}>Create one</Button>}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create one' }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('omits subtitle when not provided', () => {
    render(wrap(<EmptyState title="Empty" />));
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('renders icon slot', () => {
    render(wrap(<EmptyState title="Nothing" icon={<span data-testid="icon">📭</span>} />));
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
