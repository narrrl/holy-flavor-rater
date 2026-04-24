import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';

export interface BannerPerfState {
  isActive: boolean;
  targetFps: number;
}

const defaultState: BannerPerfState = { isActive: true, targetFps: 60 };

export const BannerPerfContext = createContext<BannerPerfState>(defaultState);

export interface BannerPerformanceWrapperProps {
  children: ReactNode;
  targetFps?: number;
  rootMargin?: string;
}

export const BannerPerformanceWrapper = ({
  children,
  targetFps = 30,
  rootMargin = '100px',
}: BannerPerformanceWrapperProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(true);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.01,
      rootMargin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  const value = useMemo<BannerPerfState>(
    () => ({
      isActive: visible && !reducedMotion,
      targetFps: reducedMotion ? 0 : targetFps,
    }),
    [visible, reducedMotion, targetFps],
  );

  return (
    <BannerPerfContext.Provider value={value}>
      <Box ref={ref} sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {children}
      </Box>
    </BannerPerfContext.Provider>
  );
};

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
