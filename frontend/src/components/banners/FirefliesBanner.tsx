import React, { useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';
import { CANVAS_STYLE, useCanvasBanner } from './useCanvasBanner';

interface FirefliesBannerProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
  settings?: {
    count?: number;
    speed?: number;
    evasionRadius?: number;
    evasionStrength?: number;
    glowSize?: number;
    flickerSpeed?: number;
  };
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  phase: number;
  noiseOffset: number;
  isEvading: boolean;
}

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const FirefliesBanner: React.FC<FirefliesBannerProps> = ({ username, palette, settings }) => {
  const theme = useTheme();

  const count = settings?.count ?? 150;
  const baseSpeed = settings?.speed ?? 0.8;
  const evasionRadius = settings?.evasionRadius ?? 180;
  const evasionStrength = settings?.evasionStrength ?? 0.6;
  const glowSizeMultiplier = settings?.glowSize ?? 4;
  const flickerSpeed = settings?.flickerSpeed ?? 0.05;

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

  const ref = useCanvasBanner<{ swarm: Firefly[]; time: number }>({
    init: (width, height) => {
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };
      const swarm: Firefly[] = [];
      for (let i = 0; i < count; i++) {
        swarm.push({
          x: pseudoRandom(i) * width,
          y: pseudoRandom(i + 500) * height,
          vx: (pseudoRandom(i + 1000) - 0.5) * baseSpeed,
          vy: (pseudoRandom(i + 1500) - 0.5) * baseSpeed,
          size: 1 + pseudoRandom(i + 2000) * 2,
          color: brightColors[i % brightColors.length],
          phase: pseudoRandom(i + 2500) * Math.PI * 2,
          noiseOffset: pseudoRandom(i + 3000) * 100,
          isEvading: false,
        });
      }
      return { swarm, time: 0 };
    },
    draw: ({ ctx, width, height, state, mouse }) => {
      const { swarm } = state;
      state.time += flickerSpeed;
      const time = state.time;

      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

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
        bgGrad.addColorStop(0, alpha(brightColors[2] || '#1a1a2e', 0.85));
        bgGrad.addColorStop(1, alpha(brightColors[2] || '#16213e', 1.0));
      } else {
        bgGrad.addColorStop(0, '#141a2a');
        bgGrad.addColorStop(1, '#05080f');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      swarm.forEach((f, i) => {
        const driftX = Math.sin(time * 0.5 + f.noiseOffset) * 0.05;
        const driftY = Math.cos(time * 0.4 + f.noiseOffset) * 0.05;

        const jitterX = (pseudoRandom(i + time * 10) - 0.5) * 0.2;
        const jitterY = (pseudoRandom(i + 500 + time * 10) - 0.5) * 0.2;

        f.vx += driftX + jitterX;
        f.vy += driftY + jitterY;

        const dx = mouse.x - f.x;
        const dy = mouse.y - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        f.isEvading = dist < evasionRadius;
        if (f.isEvading) {
          const force = (evasionRadius - dist) / evasionRadius;
          const angle = Math.atan2(dy, dx);
          f.vx -= Math.cos(angle) * force * evasionStrength * 1.5;
          f.vy -= Math.sin(angle) * force * evasionStrength * 1.5;
        }

        const currentSpeed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        const maxSpeed = f.isEvading ? baseSpeed * 10 : baseSpeed * 1.5;

        if (currentSpeed > maxSpeed) {
          f.vx = (f.vx / currentSpeed) * maxSpeed;
          f.vy = (f.vy / currentSpeed) * maxSpeed;
        }

        f.vx *= 0.97;
        f.vy *= 0.97;

        f.x += f.vx;
        f.y += f.vy;

        const margin = 20;
        if (f.x < -margin) f.x = width + margin;
        if (f.x > width + margin) f.x = -margin;
        if (f.y < -margin) f.y = height + margin;
        if (f.y > height + margin) f.y = -margin;

        const flicker = 0.4 + Math.sin(time + f.phase) * 0.6;
        const opacity = flicker > 0 ? flicker : 0;

        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * glowSizeMultiplier);
        grad.addColorStop(0, alpha(f.color, opacity));
        grad.addColorStop(0.4, alpha(f.color, opacity * 0.3));
        grad.addColorStop(1, alpha(f.color, 0));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * glowSizeMultiplier, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = alpha('#fff', opacity * 0.8);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    deps: [
      seed,
      brightColors,
      count,
      baseSpeed,
      evasionRadius,
      evasionStrength,
      glowSizeMultiplier,
      flickerSpeed,
      theme,
    ],
  });

  return <canvas ref={ref} style={CANVAS_STYLE} />;
};

export default FirefliesBanner;
