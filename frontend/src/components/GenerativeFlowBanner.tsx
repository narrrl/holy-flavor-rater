import React, { useRef, useEffect, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';

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

const GenerativeFlowBanner: React.FC<GenerativeFlowProps> = ({ username, palette, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  const blobCount = settings?.blobCount ?? 8;
  const flowSpeed = settings?.flowSpeed ?? 0.008;
  const vibrancy = settings?.vibrancy ?? 0.8;
  const blurAmount = settings?.blur ?? 60;
  const distortionFactor = settings?.distortion ?? 1.2;

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
    return sorted.slice(0, 4);
  }, [palette, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

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

    let blobs: Blob[] = [];

    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const initBlobs = (width: number, height: number) => {
      const newBlobs = [];
      for (let i = 0; i < blobCount; i++) {
        const rx = pseudoRandom(i) * width;
        const ry = pseudoRandom(i + 500) * height;
        newBlobs.push({
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
      return newBlobs;
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
        blobs = initBlobs(rect.width, rect.height);
      }
    };

    const resizeObserver = new ResizeObserver(() => resize());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    resize();

    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', () => {
        mouse.x = -1000;
        mouse.y = -1000;
      });
    }

    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      if (!width || !height) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Background Base
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
        // For light themes, use a deeper, more saturated version of the theme color
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

      time += flowSpeed;

      // Apply filter for "Liquid" look
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.globalCompositeOperation = 'screen';

      blobs.forEach((b) => {
        // Harmonic autonomous drift
        const driftX = Math.sin(time * b.speedFactor + b.phase) * (width / 5);
        const driftY = Math.cos(time * 0.8 * b.speedFactor + b.phase) * (height / 5);

        // Mouse distortion
        const dxMouse = mouse.x - b.ox;
        const dyMouse = mouse.y - b.oy;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        const mouseForce = Math.max(0, (500 - distMouse) / 500);

        const mX = dxMouse * mouseForce * distortionFactor;
        const mY = dyMouse * mouseForce * distortionFactor;

        b.x = b.ox + driftX + mX;
        b.y = b.oy + driftY + mY;

        // Pulsing size
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

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [seed, brightColors, blobCount, flowSpeed, vibrancy, blurAmount, distortionFactor, theme]);

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
        zIndex: 1,
      }}
    />
  );
};

export default GenerativeFlowBanner;
