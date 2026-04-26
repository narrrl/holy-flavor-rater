import React, { useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';
import { CANVAS_STYLE, useCanvasBanner } from './useCanvasBanner';

interface HextechBannerProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
  settings?: {
    gridSize?: number;
    pulseSpeed?: number;
    glowIntensity?: number;
    streamCount?: number;
    distortion?: number;
  };
}

interface Stream {
  segments: { x: number; y: number }[];
  color: string;
  life: number;
  speed: number;
}

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const HextechBanner: React.FC<HextechBannerProps> = ({ username, palette, settings }) => {
  const theme = useTheme();

  const gridSize = settings?.gridSize ?? 40;
  const pulseSpeed = settings?.pulseSpeed ?? 0.02;
  const glowIntensity = settings?.glowIntensity ?? 0.8;
  const streamCount = settings?.streamCount ?? 12;
  const distortionFactor = settings?.distortion ?? 0.5;

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

  const ref = useCanvasBanner<{ streams: Stream[]; time: number }>({
    init: () => ({ streams: [], time: 0 }),
    draw: ({ ctx, width, height, state, mouse }) => {
      state.time += pulseSpeed;
      const time = state.time;

      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      const drawHexagon = (x: number, y: number, r: number, tilt: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i + tilt;
          const px = x + r * Math.cos(angle);
          const py = y + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
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
        bgGrad.addColorStop(0, alpha(brightColors[2] || brightColors[0], 0.65));
        bgGrad.addColorStop(1, alpha(brightColors[2] || brightColors[0], 0.95));
      } else {
        bgGrad.addColorStop(0, '#0a051a');
        bgGrad.addColorStop(1, '#020105');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 1;
      const h = gridSize * Math.sqrt(3);
      const w = gridSize * 2;

      for (let y = -gridSize; y < height + gridSize; y += h / 2) {
        for (let x = -gridSize; x < width + gridSize; x += w * 0.75) {
          const xOffset = Math.floor(y / (h / 2)) % 2 === 0 ? 0 : w * 0.375;
          const finalX = x + xOffset;
          const finalY = y;

          const dist = Math.sqrt(Math.pow(finalX - mouse.x, 2) + Math.pow(finalY - mouse.y, 2));
          const mouseImpact = Math.max(0, (200 - dist) / 200) * (mouse.down ? 2 : 1);

          const dx =
            Math.sin(time + finalX * 0.01) * gridSize * distortionFactor * (1 + mouseImpact);
          const dy =
            Math.cos(time + finalY * 0.01) * gridSize * distortionFactor * (1 + mouseImpact);

          const drawX = finalX + dx;
          const drawY = finalY + dy;

          const pulseVal = 0.1 + Math.sin(time * 2 + (finalX + finalY) * 0.005) * 0.1;
          const opacity = (0.1 + pulseVal + mouseImpact * 0.3) * glowIntensity;

          ctx.strokeStyle = alpha(brightColors[0], opacity);
          drawHexagon(drawX, drawY, gridSize * 0.9, time * 0.1);
          ctx.stroke();

          if (pseudoRandom(Math.floor(finalX) + Math.floor(finalY)) > 0.92) {
            ctx.fillStyle = alpha(brightColors[1], opacity * 0.5);
            ctx.font = `${gridSize * 0.5}px serif`;
            ctx.fillText('⚡', drawX - 5, drawY + 5);
          }
        }
      }

      if (state.streams.length < streamCount && Math.random() > 0.9) {
        const color = brightColors[Math.floor(pseudoRandom(time) * brightColors.length)];
        state.streams.push({
          segments: [{ x: pseudoRandom(time + 1) * width, y: pseudoRandom(time + 2) * height }],
          color,
          life: 1.0,
          speed: 2 + pseudoRandom(time + 3) * 4,
        });
      }

      ctx.globalCompositeOperation = 'screen';
      state.streams.forEach((s, idx) => {
        s.life -= 0.005;
        const last = s.segments[s.segments.length - 1];

        const ang = pseudoRandom(time + idx) * Math.PI * 2;
        const nextX = last.x + Math.cos(ang) * s.speed;
        const nextY = last.y + Math.sin(ang) * s.speed;

        s.segments.push({ x: nextX, y: nextY });
        if (s.segments.length > 20) s.segments.shift();

        ctx.beginPath();
        ctx.strokeStyle = alpha(s.color, s.life * glowIntensity);
        ctx.lineWidth = 2;
        s.segments.forEach((seg, i) => {
          if (i === 0) ctx.moveTo(seg.x, seg.y);
          else ctx.lineTo(seg.x, seg.y);
        });
        ctx.stroke();

        const head = s.segments[s.segments.length - 1];
        const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 15);
        g.addColorStop(0, alpha(s.color, s.life));
        g.addColorStop(1, alpha(s.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 15, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';

      state.streams = state.streams.filter((s) => s.life > 0);
    },
    deps: [
      seed,
      brightColors,
      gridSize,
      pulseSpeed,
      glowIntensity,
      streamCount,
      distortionFactor,
      theme,
    ],
  });

  return <canvas ref={ref} style={CANVAS_STYLE} />;
};

export default HextechBanner;
