import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { BannerPerformanceWrapper } from './BannerPerformanceWrapper';
import { CANVAS_STYLE, useCanvasBanner } from './useCanvasBanner';

type ROCallback = (entries: ResizeObserverEntry[]) => void;

let roCallback: ROCallback | null = null;
let roObserveMock = vi.fn();
let roDisconnectMock = vi.fn();

class FakeResizeObserver {
  constructor(cb: ROCallback) {
    roCallback = cb;
  }
  observe = roObserveMock;
  disconnect = roDisconnectMock;
  unobserve = vi.fn();
}

class FakeIntersectionObserver {
  constructor() {}
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = () => [];
  root = null;
  rootMargin = '';
  thresholds = [];
}

let rafCallbacks: FrameRequestCallback[] = [];
const flushRaf = () => {
  const cbs = rafCallbacks;
  rafCallbacks = [];
  cbs.forEach((cb) => cb(performance.now()));
};

beforeEach(() => {
  roCallback = null;
  roObserveMock = vi.fn();
  roDisconnectMock = vi.fn();
  rafCallbacks = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = FakeResizeObserver;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IntersectionObserver = FakeIntersectionObserver;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 200,
    height: 100,
    top: 0,
    left: 0,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  // jsdom doesn't implement Canvas 2D — stub it.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () =>
      ({
        scale: vi.fn(),
        setTransform: vi.fn(),
      }) as any,
  );
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).ResizeObserver;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).IntersectionObserver;
  vi.restoreAllMocks();
});

const Harness = ({
  init,
  draw,
}: {
  init: (w: number, h: number) => { count: number };
  draw: (ctx: { state: { count: number } }) => void;
}) => {
  const ref = useCanvasBanner<{ count: number }>({
    init,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draw: draw as any,
    deps: [],
  });
  return (
    <BannerPerformanceWrapper>
      <canvas ref={ref} style={CANVAS_STYLE} data-testid="banner-canvas" />
    </BannerPerformanceWrapper>
  );
};

describe('useCanvasBanner', () => {
  it('renders a canvas and calls init with the parent size', () => {
    const init = vi.fn(() => ({ count: 1 }));
    const draw = vi.fn();
    const { getByTestId } = render(<Harness init={init} draw={draw} />);
    expect(getByTestId('banner-canvas').tagName).toBe('CANVAS');
    expect(init).toHaveBeenCalledWith(200, 100);
  });

  it('runs draw at least once on the next animation frame', () => {
    const init = vi.fn(() => ({ count: 7 }));
    const draw = vi.fn();
    render(<Harness init={init} draw={draw} />);
    act(() => {
      flushRaf();
    });
    expect(draw).toHaveBeenCalled();
    const arg = draw.mock.calls[0][0];
    expect(arg.state.count).toBe(7);
    expect(arg.width).toBe(200);
    expect(arg.height).toBe(100);
  });

  it('re-runs init when ResizeObserver fires', () => {
    const init = vi.fn(() => ({ count: 0 }));
    const draw = vi.fn();
    render(<Harness init={init} draw={draw} />);
    expect(init).toHaveBeenCalledTimes(1);
    act(() => {
      roCallback?.([{} as ResizeObserverEntry]);
    });
    expect(init).toHaveBeenCalledTimes(2);
  });

  it('disconnects ResizeObserver on unmount', () => {
    const init = vi.fn(() => ({ count: 0 }));
    const draw = vi.fn();
    const { unmount } = render(<Harness init={init} draw={draw} />);
    unmount();
    expect(roDisconnectMock).toHaveBeenCalled();
  });
});
