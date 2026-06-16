import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import { BannerPerfContext, type BannerPerfState } from './banner-perf';

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
