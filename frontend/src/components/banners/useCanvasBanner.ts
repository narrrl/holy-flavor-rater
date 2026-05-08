import { useEffect, useRef, type CSSProperties, type DependencyList, type RefObject } from 'react';
import { useBannerFrameGate } from './BannerPerformanceWrapper';

export interface CanvasMouse {
  x: number;
  y: number;
  px: number;
  py: number;
  down: boolean;
}

export interface DrawArgs<S> {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  state: S;
  mouse: CanvasMouse;
  now: number;
}

export interface UseCanvasBannerOptions<S> {
  init: (width: number, height: number) => S;
  draw: (args: DrawArgs<S>) => void;
  observeTouch?: boolean;
  trackPrev?: boolean;
  deps: DependencyList;
}

const SENTINEL = -1000;

const makeMouse = (): CanvasMouse => ({
  x: SENTINEL,
  y: SENTINEL,
  px: SENTINEL,
  py: SENTINEL,
  down: false,
});

export function useCanvasBanner<S>({
  init,
  draw,
  observeTouch = false,
  trackPrev = false,
  deps,
}: UseCanvasBannerOptions<S>): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gate = useBannerFrameGate();

  // Refs allow the effect dep list to drive re-init without losing identity
  // of init/draw callbacks across renders.
  const initRef = useRef(init);
  const drawRef = useRef(draw);
  initRef.current = init;
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let state: S | null = null;
    const mouse = makeMouse();

    const dpr = () => window.devicePixelRatio || 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const ratio = dpr();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      // Reset before scaling so repeated resizes don't compound the transform.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);
      state = initRef.current(rect.width, rect.height);
    };

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();

    const updateFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (trackPrev) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;
      }
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        mouse.x = SENTINEL;
        mouse.y = SENTINEL;
        mouse.down = false;
        return false;
      }
      mouse.x = x;
      mouse.y = y;
      return true;
    };

    const onMouseMove = (e: MouseEvent) => {
      updateFromClient(e.clientX, e.clientY);
    };

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        mouse.down = true;
      }
    };

    const onMouseUp = () => {
      mouse.down = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateFromClient(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0 && updateFromClient(e.touches[0].clientX, e.touches[0].clientY)) {
        mouse.down = true;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    if (observeTouch) {
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchstart', onTouchStart);
      window.addEventListener('touchend', onMouseUp);
    }

    const tick = (now = 0) => {
      const decision = gate(now);
      if (decision === 'halt') return;
      if (decision === 'skip') {
        raf = requestAnimationFrame(tick);
        return;
      }
      const ratio = dpr();
      const width = canvas.width / ratio;
      const height = canvas.height / ratio;
      if (width && height && state !== null) {
        drawRef.current({ ctx, width, height, state, mouse, now });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      if (observeTouch) {
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchend', onMouseUp);
      }
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, observeTouch, trackPrev, ...deps]);

  return canvasRef;
}

export const CANVAS_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 0,
};
