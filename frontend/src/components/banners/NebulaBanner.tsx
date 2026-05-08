import React, { useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';
import { CANVAS_STYLE, useCanvasBanner } from './useCanvasBanner';

interface NebulaBannerProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
  settings?: {
    particleCount?: number;
    speed?: number;
    opacity?: number;
    smearRadius?: number;
    turbulence?: number;
    returnSpeed?: number;
    starDensity?: number;
  };
}

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  phase: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const NebulaBanner: React.FC<NebulaBannerProps> = ({
  username,
  palette,
  ratingsCount,
  followersCount,
  settings,
}) => {
  const theme = useTheme();

  const particleCount = settings?.particleCount ?? 400;
  const speed = settings?.speed ?? 0.0015;
  const globalOpacity = settings?.opacity ?? 0.6;
  const smearRadius = settings?.smearRadius ?? 120;
  const turbulenceStrength = settings?.turbulence ?? 0.4;
  const returnSpeed = settings?.returnSpeed ?? 0.004;
  const starDensity = settings?.starDensity ?? 150;

  const seed = useMemo(() => hashString(username), [username]);

  const colors = useMemo(
    () =>
      palette.length >= 2
        ? palette
        : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main],
    [palette, theme],
  );

  const ref = useCanvasBanner<{ stars: Star[]; particles: Particle[]; time: number }>({
    init: (width, height) => {
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      const stars: Star[] = [];
      for (let i = 0; i < starDensity; i++) {
        stars.push({
          x: pseudoRandom(i + 5000) * width,
          y: pseudoRandom(i + 6000) * height,
          size: pseudoRandom(i + 7000) * 1.5,
          opacity: 0.1 + pseudoRandom(i + 8000) * 0.5,
        });
      }

      const clusterCount = colors.length * 3;
      const groupCenters = Array.from({ length: clusterCount }).map((_, i) => ({
        x: (pseudoRandom(i * 15) * 0.8 + 0.1) * width,
        y: (pseudoRandom(i * 25 + 7) * 0.8 + 0.1) * height,
      }));

      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        const clusterIdx = i % clusterCount;
        const colorIdx = clusterIdx % colors.length;
        const center = groupCenters[clusterIdx];
        const angle = pseudoRandom(i + 100) * Math.PI * 2;
        const dist = pseudoRandom(i + 200) * (width * 0.12);
        const bx = center.x + Math.cos(angle) * dist;
        const by = center.y + Math.sin(angle) * dist;

        particles.push({
          x: bx,
          y: by,
          baseX: bx,
          baseY: by,
          vx: 0,
          vy: 0,
          size: 40 + pseudoRandom(i + 300) * 80,
          color: colors[colorIdx],
          alpha: 0,
          targetAlpha: 0.05 + pseudoRandom(i + 400) * 0.15,
          phase: pseudoRandom(i + 500) * Math.PI * 2,
        });
      }

      return { stars, particles, time: 0 };
    },
    draw: ({ ctx, width, height, state, mouse }) => {
      const { stars, particles } = state;
      ctx.clearRect(0, 0, width, height);

      const isLight = theme.palette.mode === 'light';
      const skyGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        width,
      );

      if (isLight) {
        skyGrad.addColorStop(0, alpha(colors[colors.length - 1], 0.7));
        skyGrad.addColorStop(0.5, alpha(colors[colors.length - 1], 0.9));
        skyGrad.addColorStop(1, alpha(colors[colors.length - 1], 1.0));
      } else {
        skyGrad.addColorStop(0, '#1a1a3a');
        skyGrad.addColorStop(0.5, '#0a0a1a');
        skyGrad.addColorStop(1, '#050508');
      }

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';
      stars.forEach((s) => {
        ctx.globalAlpha = s.opacity * (0.7 + Math.sin(state.time * 2 + s.x) * 0.3);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      state.time += speed;
      const time = state.time;

      particles.forEach((p) => {
        const dxBase = p.baseX - p.x;
        const dyBase = p.baseY - p.y;
        p.vx += dxBase * returnSpeed;
        p.vy += dyBase * returnSpeed;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < smearRadius) {
          const force = (smearRadius - dist) / smearRadius;
          if (mouse.down) {
            const angle = Math.atan2(dy, dx);
            p.vx += Math.cos(angle + Math.PI / 2) * turbulenceStrength * 2;
            p.vy += Math.sin(angle + Math.PI / 2) * turbulenceStrength * 2;
          } else {
            const mdx = mouse.x - mouse.px;
            const mdy = mouse.y - mouse.py;
            p.vx += mdx * force * 0.15;
            p.vy += mdy * force * 0.15;
            p.vx -= (dx / dist) * force * 0.8;
            p.vy -= (dy / dist) * force * 0.8;
          }
        }

        p.vx += Math.sin(time + p.phase) * 0.03;
        p.vy += Math.cos(time * 0.8 + p.phase) * 0.03;

        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;

        if (p.alpha < p.targetAlpha) p.alpha += 0.001;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        const colorAlpha = p.alpha * globalOpacity;
        grad.addColorStop(0, alpha(p.color, colorAlpha));
        grad.addColorStop(0.6, alpha(p.color, colorAlpha * 0.2));
        grad.addColorStop(1, alpha(p.color, 0));

        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
    },
    trackPrev: true,
    deps: [
      seed,
      colors,
      ratingsCount,
      followersCount,
      theme,
      particleCount,
      speed,
      globalOpacity,
      smearRadius,
      turbulenceStrength,
      returnSpeed,
      starDensity,
    ],
  });

  return <canvas ref={ref} style={CANVAS_STYLE} />;
};

export default NebulaBanner;
