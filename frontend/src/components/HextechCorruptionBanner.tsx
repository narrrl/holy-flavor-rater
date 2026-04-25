import React, { useRef, useEffect, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';
import { useBannerFrameGate } from './BannerPerformanceWrapper';

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

const HextechCorruptionBanner: React.FC<HextechCorruptionBannerProps> = ({
  username,
  palette,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const gate = useBannerFrameGate();

  const cellCount = settings?.cellCount ?? 40;
  const shimmerSpeed = settings?.shimmerSpeed ?? 0.015;
  const glowIntensity = settings?.glowIntensity ?? 0.9;
  const instability = settings?.instability ?? 0.6;
  const shellDarkness = settings?.shellDarkness ?? 0.85;

  const getSeed = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const seed = useMemo(() => getSeed(username), [username]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

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

    let points: ControlPoint[] = [];

    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const initPoints = (width: number, height: number) => {
      const newPoints = [];
      for (let i = 0; i < cellCount; i++) {
        const rx = pseudoRandom(i) * width;
        const ry = pseudoRandom(i + 500) * height;
        newPoints.push({
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
      return newPoints;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        points = initPoints(rect.width, rect.height);
      }
    };

    const resizeObserver = new ResizeObserver(() => resize());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    resize();

    const mouse = { x: -1000, y: -1000, down: false };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        mouse.x = -1000;
        mouse.y = -1000;
        mouse.down = false;
      } else {
        mouse.x = x;
        mouse.y = y;
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        mouse.down = true;
      }
    };
    const handleMouseUp = () => {
      mouse.down = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const draw = (now = 0) => {
      const decision = gate(now);
      if (decision === 'halt') return;
      if (decision === 'skip') {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      if (!width || !height) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      time += shimmerSpeed;

      // 1. Draw Under-Glow (Inner Cores)
      ctx.globalCompositeOperation = 'source-over';
      points.forEach((p) => {
        // Harmonic motion + mouse interaction
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

      // 2. Draw Dark "Void" Shell (Voronoi-based cutout)
      // We use a temporary canvas to draw the shell then mask it, or just use a heavy overlay
      ctx.globalCompositeOperation = 'source-over';

      // Create the "holes" effect by using a pattern of circles that are actually transparent
      // Actually, to get the specific look from the image, we can use a simpler approach:
      // Layer a dark color over everything, but with 'destination-out' circles at the point locations.

      const offCanvas = document.createElement('canvas');
      offCanvas.width = canvas.width;
      offCanvas.height = canvas.height;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        const dpr = window.devicePixelRatio || 1;
        offCtx.scale(dpr, dpr);

        // Draw full dark shell
        const shellColor =
          theme.palette.mode === 'light'
            ? alpha('#1a0a2a', shellDarkness)
            : alpha('#05020a', shellDarkness);
        offCtx.fillStyle = shellColor;
        offCtx.fillRect(0, 0, width, height);

        // Cut holes
        offCtx.globalCompositeOperation = 'destination-out';
        points.forEach((p) => {
          const holeSize = 15 + Math.sin(time + p.phase) * 5 + instability * 10;

          // Main hole
          offCtx.beginPath();
          offCtx.arc(p.x, p.y, holeSize, 0, Math.PI * 2);
          offCtx.fill();

          // Add secondary smaller holes for that "punctured" look
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

      // 3. Add Iridescent Edge Highlights
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
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    seed,
    brightColors,
    cellCount,
    shimmerSpeed,
    glowIntensity,
    instability,
    shellDarkness,
    theme,
    gate,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default HextechCorruptionBanner;
