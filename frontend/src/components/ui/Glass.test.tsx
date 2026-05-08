import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme, type CatppuccinTheme } from '../../theme';
import { GlassCard, GlassPaper, GlassSurface } from './Glass';

const collectStyles = () =>
  Array.from(document.querySelectorAll('style'))
    .map((s) => s.textContent ?? '')
    .join('\n');

const renderWithTheme = (ui: React.ReactElement, mode: CatppuccinTheme = 'mocha') => {
  const theme = getTheme(mode);
  const result = render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
  return { theme, ...result };
};

describe('Glass primitives', () => {
  it('GlassCard applies backdrop blur + token-derived border via emotion styles', () => {
    const { getByTestId, theme } = renderWithTheme(
      <GlassCard data-testid="glass">content</GlassCard>,
    );
    const el = getByTestId('glass');

    expect(el.className).toMatch(/css-/);

    const css = collectStyles();
    expect(css).toContain('backdrop-filter:blur(');
    expect(css).toContain('saturate(');
    expect(css).toContain(theme.tokens.glass.border);
    expect(css).toContain(theme.tokens.glass.tint);
  });

  it('GlassCard intensity="strong" emits blurStrong + tintStrong into emitted CSS', () => {
    const { theme } = renderWithTheme(
      <GlassCard data-testid="g" intensity="strong">
        x
      </GlassCard>,
    );
    const css = collectStyles();
    expect(css).toContain(theme.tokens.glass.blurStrong);
    expect(css).toContain(theme.tokens.glass.tintStrong);
  });

  it('GlassCard intensity="subtle" emits tintSubtle into emitted CSS', () => {
    const { theme } = renderWithTheme(
      <GlassCard data-testid="g" intensity="subtle">
        x
      </GlassCard>,
    );
    const css = collectStyles();
    expect(css).toContain(theme.tokens.glass.tintSubtle);
  });

  it('does not forward `intensity` prop to the DOM', () => {
    const { getByTestId } = renderWithTheme(
      <GlassCard data-testid="g" intensity="strong">
        x
      </GlassCard>,
    );
    expect(getByTestId('g').getAttribute('intensity')).toBeNull();
  });

  it('GlassPaper + GlassSurface emit glass tint on a light theme', () => {
    const { theme } = renderWithTheme(
      <>
        <GlassPaper data-testid="p">paper</GlassPaper>
        <GlassSurface data-testid="s">surface</GlassSurface>
      </>,
      'holy_light',
    );
    const css = collectStyles();
    expect(css).toContain(theme.tokens.glass.tint);
    expect(css).toContain(theme.tokens.glass.border);
  });
});
