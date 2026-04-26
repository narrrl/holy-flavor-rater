import React, { useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';
import { CANVAS_STYLE, useCanvasBanner } from './useCanvasBanner';

interface GenerativeFlowProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
  settings?: {
    blobCount?: number;
    flowSpeed?: number;
    vibrancy?: number;
    blur?: number;
    distortion?: number;
  };
}

interface Blob {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  phase: number;
  speedFactor: number;
}

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const GenerativeFlowBanner: React.FC<GenerativeFlowProps> = ({ username, palette, settings }) => {
  const theme = useTheme();

  const blobCount = settings?.blobCount ?? 8;
  const flowSpeed = settings?.flowSpeed ?? 0.008;
  const vibrancy = settings?.vibrancy ?? 0.8;
  const blurAmount = settings?.blur ?? 60;
  const distortionFactor = settings?.distortion ?? 1.2;

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
    return sorted.slice(0, 4);
  }, [palette, theme]);

  const ref = useCanvasBanner<{ blobs: Blob[]; time: number }>({
    init: (width, height) => {
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };
      const blobs: Blob[] = [];
      for (let i = 0; i < blobCount; i++) {
        const rx = pseudoRandom(i) * width;
        const ry = pseudoRandom(i + 500) * height;
        blobs.push({
          x: rx,
          y: ry,
          ox: rx,
          oy: ry,
          vx: 0,
          vy: 0,
          size: width / 4 + pseudoRandom(i + 1000) * (width / 3),
          color: brightColors[i % brightColors.length],
          phase: pseudoRandom(i + 1500) * Math.PI * 2,
          speedFactor: 0.5 + pseudoRandom(i + 2000),
        });
      }
      return { blobs, time: 0 };
    },
    draw: ({ ctx, width, height, state, mouse }) => {
      const { blobs } = state;
      state.time += flowSpeed;
      const time = state.time;

      ctx.clearRect(0, 0, width, height);

      const isLight = theme.palette.mode === 'light';
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        width,
      );
      if (isLight) {
        bgGrad.addColorStop(
          0,
          alpha(brightColors[brightColors.length - 1] || brightColors[0], 0.6),
        );
        bgGrad.addColorStop(
          1,
          alpha(brightColors[brightColors.length - 1] || brightColors[0], 0.9),
        );
      } else {
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(1, '#020205');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.filter = `blur(${blurAmount}px)`;
      ctx.globalCompositeOperation = 'screen';

      blobs.forEach((b) => {
        const driftX = Math.sin(time * b.speedFactor + b.phase) * (width / 5);
        const driftY = Math.cos(time * 0.8 * b.speedFactor + b.phase) * (height / 5);

        const dxMouse = mouse.x - b.ox;
        const dyMouse = mouse.y - b.oy;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        const mouseForce = Math.max(0, (500 - distMouse) / 500);

        const mX = dxMouse * mouseForce * distortionFactor;
        const mY = dyMouse * mouseForce * distortionFactor;

        b.x = b.ox + driftX + mX;
        b.y = b.oy + driftY + mY;

        const pulse = 1 + Math.sin(time + b.phase) * 0.1;
        const currentSize = b.size * pulse;

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, currentSize);
        grad.addColorStop(0, alpha(b.color, vibrancy));
        grad.addColorStop(1, alpha(b.color, 0));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    },
    deps: [seed, brightColors, blobCount, flowSpeed, vibrancy, blurAmount, distortionFactor, theme],
  });

  return <canvas ref={ref} style={CANVAS_STYLE} />;
};

export default GenerativeFlowBanner;
