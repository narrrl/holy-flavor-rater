import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from '../../theme';
import { FlavorCard } from './FlavorCard';

const renderCard = (overrides = {}) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={getTheme('mocha')}>
        <FlavorCard
          flavor={{
            id: 42,
            name: 'Blueberry Dust',
            image_url: '/media/flavors/blueberry.jpg',
            average_rating: 7.5,
            category_name: 'Fruit',
            is_legacy: false,
            is_available: true,
            ...overrides,
          }}
        />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe('FlavorCard', () => {
  it('renders name, category, image, and rating', () => {
    renderCard();
    expect(screen.getByText('Blueberry Dust')).toBeInTheDocument();
    expect(screen.getByText('Fruit')).toBeInTheDocument();
    const img = screen.getByAltText('Blueberry Dust') as HTMLImageElement;
    expect(img.src).toContain('/media/flavors/blueberry.jpg');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('links to /flavor/:id', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/flavor/42');
  });

  it('omits category row when showCategory=false', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={getTheme('mocha')}>
          <FlavorCard
            flavor={{ id: 1, name: 'X', category_name: 'Fruit' }}
            showCategory={false}
          />
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Fruit')).not.toBeInTheDocument();
  });

  it('renders status badge when flavor is legacy', () => {
    renderCard({ is_legacy: true, is_available: true });
    expect(screen.getByText(/Limited/i)).toBeInTheDocument();
  });

  it('renders caption when provided', () => {
    renderCard({});
    expect(screen.queryByText('12 reviews')).not.toBeInTheDocument();
    render(
      <MemoryRouter>
        <ThemeProvider theme={getTheme('mocha')}>
          <FlavorCard
            flavor={{ id: 2, name: 'Cap', average_rating: 5 }}
            caption="12 reviews"
          />
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('12 reviews')).toBeInTheDocument();
  });
});
