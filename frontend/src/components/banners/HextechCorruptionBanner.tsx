import React, { useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';
import { CANVAS_STYLE, useCanvasBanner } from './useCanvasBanner';

interface HextechCorruptionBannerProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
  settings?: {
    cellCount?: number;
    shimmerSpeed?: number;
    glowIntensity?: number;
    instability?: number;
    shellDarkness?: number;
  };
}

interface ControlPoint {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  phase: number;
  color: string;
}

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const HextechCorruptionBanner: React.FC<HextechCorruptionBannerProps> = ({
  username,
  palette,
  settings,
}) => {
  const theme = useTheme();

  const cellCount = settings?.cellCount ?? 40;
  const shimmerSpeed = settings?.shimmerSpeed ?? 0.015;
  const glowIntensity = settings?.glowIntensity ?? 0.9;
  const instability = settings?.instability ?? 0.6;
  const shellDarkness = settings?.shellDarkness ?? 0.85;

  const seed = useMemo(() => hashString(username), [username]);

  const brightColors = useMemo(() => {
    const colors =
      palette.length >= 2
        ? palette
        : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main];
    const getBrightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      return (r * 299 + g * 587 + b * 114) / 1000;
    };
    const sorted = [...colors].sort((a, b) => getBrightness(b) - getBrightness(a));
    return sorted.slice(0, 3);
  }, [palette, theme]);

  const ref = useCanvasBanner<{ points: ControlPoint[]; time: number }>({
    init: (width, height) => {
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };
      const points: ControlPoint[] = [];
      for (let i = 0; i < cellCount; i++) {
        const rx = pseudoRandom(i) * width;
        const ry = pseudoRandom(i + 500) * height;
        points.push({
          x: rx,
          y: ry,
          ox: rx,
          oy: ry,
          vx: 0,
          vy: 0,
          phase: pseudoRandom(i + 1000) * Math.PI * 2,
          color: brightColors[i % brightColors.length],
        });
      }
      return { points, time: 0 };
    },
    draw: ({ ctx, width, height, state, mouse }) => {
      const { points } = state;
      state.time += shimmerSpeed;
      const time = state.time;

      ctx.clearRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'source-over';
      points.forEach((p) => {
        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        const mouseForce = Math.max(0, (300 - distMouse) / 300);

        const driftX = Math.sin(time + p.phase) * 20 * instability;
        const driftY = Math.cos(time * 0.8 + p.phase) * 20 * instability;

        p.x = p.ox + driftX + (mouse.down ? -dxMouse * mouseForce * 0.5 : 0);
        p.y = p.oy + driftY + (mouse.down ? -dyMouse * mouseForce * 0.5 : 0);

        const pulse = 0.7 + Math.sin(time * 3 + p.phase) * 0.3;
        const glowSize = 60 + mouseForce * 40;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        grad.addColorStop(0, alpha(p.color, 0.8 * glowIntensity * pulse));
        grad.addColorStop(0.5, alpha(p.color, 0.3 * glowIntensity));
        grad.addColorStop(1, alpha(p.color, 0));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';

      const offCanvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      offCanvas.width = width * dpr;
      offCanvas.height = height * dpr;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.scale(dpr, dpr);

        const shellColor =
          theme.palette.mode === 'light'
            ? alpha('#1a0a2a', shellDarkness)
            : alpha('#05020a', shellDarkness);
        offCtx.fillStyle = shellColor;
        offCtx.fillRect(0, 0, width, height);

        offCtx.globalCompositeOperation = 'destination-out';
        points.forEach((p) => {
          const holeSize = 15 + Math.sin(time + p.phase) * 5 + instability * 10;

          offCtx.beginPath();
          offCtx.arc(p.x, p.y, holeSize, 0, Math.PI * 2);
          offCtx.fill();

          for (let j = 0; j < 3; j++) {
            const angle = p.phase + j * Math.PI * 0.6;
            const hx = p.x + Math.cos(angle) * (holeSize * 1.5);
            const hy = p.y + Math.sin(angle) * (holeSize * 1.5);
            offCtx.beginPath();
            offCtx.arc(hx, hy, holeSize * 0.4, 0, Math.PI * 2);
            offCtx.fill();
          }
        });

        ctx.drawImage(offCanvas, 0, 0, width, height);
      }

      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = 2;
      points.forEach((p) => {
        const pulse = 0.5 + Math.sin(time * 2 + p.phase) * 0.5;
        ctx.strokeStyle = alpha(p.color, pulse * 0.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.globalCompositeOperation = 'source-over';
    },
    deps: [
      seed,
      brightColors,
      cellCount,
      shimmerSpeed,
      glowIntensity,
      instability,
      shellDarkness,
      theme,
    ],
  });

  return <canvas ref={ref} style={CANVAS_STYLE} />;
};

export default HextechCorruptionBanner;
