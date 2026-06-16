import { createContext, useContext, useEffect, useMemo, useRef } from 'react';

export interface BannerPerfState {
  isActive: boolean;
  targetFps: number;
}

export const defaultBannerPerfState: BannerPerfState = { isActive: true, targetFps: 60 };

export const BannerPerfContext = createContext<BannerPerfState>(defaultBannerPerfState);

/**
 * Returns a ref whose .current is the live perf state. Banner rAF loops
 * read the ref synchronously inside their draw function to gate/throttle
 * without re-triggering the useEffect that sets up the canvas.
 */
export const useBannerPerfRef = () => {
  const state = useContext(BannerPerfContext);
  const ref = useRef(state);
  useEffect(() => {
    ref.current = state;
  }, [state]);
  return ref;
};

export type GateDecision = 'draw' | 'skip' | 'halt';

/**
 * Returns a stable gate function. Call it at the top of your rAF draw
 * callback with the current timestamp; act on the returned decision:
 *   - 'draw': proceed with the draw body and request the next frame
 *   - 'skip': do not draw this frame but still request the next one
 *   - 'halt': user prefers reduced motion; stop rAF entirely
 * The first frame always returns 'draw' so the canvas shows content even
 * when reduced-motion is set.
 */
export const useBannerFrameGate = () => {
  const perfRef = useBannerPerfRef();
  const stateRef = useRef({ lastTs: 0, drawnOnce: false });
  return useMemo(
    () =>
      (now: number): GateDecision => {
        const { isActive, targetFps } = perfRef.current;
        if (!stateRef.current.drawnOnce) {
          stateRef.current.drawnOnce = true;
          stateRef.current.lastTs = now;
          return 'draw';
        }
        if (!isActive) return targetFps === 0 ? 'halt' : 'skip';
        if (targetFps > 0) {
          const minDelta = 1000 / targetFps;
          if (now - stateRef.current.lastTs < minDelta) return 'skip';
        }
        stateRef.current.lastTs = now;
        return 'draw';
      },
    [perfRef],
  );
};
