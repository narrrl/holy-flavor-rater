import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useContext } from 'react';
import { act, render } from '@testing-library/react';
import { BannerPerformanceWrapper } from './BannerPerformanceWrapper';
import { BannerPerfContext } from './banner-perf';

type IOEntryLike = { isIntersecting: boolean };
type IOCallback = (entries: IOEntryLike[]) => void;

let ioCallback: IOCallback | null = null;
let observeMock = vi.fn();
let disconnectMock = vi.fn();

class FakeIntersectionObserver {
  constructor(cb: IOCallback) {
    ioCallback = cb;
  }
  observe = observeMock;
  disconnect = disconnectMock;
  unobserve = vi.fn();
  takeRecords = () => [];
  root = null;
  rootMargin = '';
  thresholds = [];
}

const mockMatchMedia = (reduced: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes('reduce') ? reduced : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
};

const Probe = () => {
  const { isActive, targetFps } = useContext(BannerPerfContext);
  return <div data-testid="probe" data-active={String(isActive)} data-fps={String(targetFps)} />;
};

describe('BannerPerformanceWrapper', () => {
  beforeEach(() => {
    ioCallback = null;
    observeMock = vi.fn();
    disconnectMock = vi.fn();
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      FakeIntersectionObserver;
    mockMatchMedia(false);
  });

  afterEach(() => {
    delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
  });

  it('defaults to isActive=true with configured targetFps', () => {
    const { getByTestId } = render(
      <BannerPerformanceWrapper targetFps={30}>
        <Probe />
      </BannerPerformanceWrapper>,
    );
    const el = getByTestId('probe');
    expect(el.dataset.active).toBe('true');
    expect(el.dataset.fps).toBe('30');
    expect(observeMock).toHaveBeenCalled();
  });

  it('flips isActive=false when IntersectionObserver reports not intersecting', () => {
    const { getByTestId } = render(
      <BannerPerformanceWrapper>
        <Probe />
      </BannerPerformanceWrapper>,
    );
    expect(getByTestId('probe').dataset.active).toBe('true');

    act(() => {
      ioCallback?.([{ isIntersecting: false }]);
    });

    expect(getByTestId('probe').dataset.active).toBe('false');

    act(() => {
      ioCallback?.([{ isIntersecting: true }]);
    });
    expect(getByTestId('probe').dataset.active).toBe('true');
  });

  it('prefers-reduced-motion forces isActive=false and targetFps=0', () => {
    mockMatchMedia(true);
    const { getByTestId } = render(
      <BannerPerformanceWrapper targetFps={30}>
        <Probe />
      </BannerPerformanceWrapper>,
    );
    const el = getByTestId('probe');
    expect(el.dataset.active).toBe('false');
    expect(el.dataset.fps).toBe('0');
  });

  it('disconnects observer on unmount', () => {
    const { unmount } = render(
      <BannerPerformanceWrapper>
        <Probe />
      </BannerPerformanceWrapper>,
    );
    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });
});
