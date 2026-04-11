import React, { useRef, useEffect, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';

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

const NebulaBanner: React.FC<NebulaBannerProps> = ({
  username,
  palette,
  ratingsCount,
  followersCount,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  const particleCount = settings?.particleCount ?? 400;
  const speed = settings?.speed ?? 0.0015;
  const globalOpacity = settings?.opacity ?? 0.6;
  const smearRadius = settings?.smearRadius ?? 120;
  const turbulenceStrength = settings?.turbulence ?? 0.4;
  const returnSpeed = settings?.returnSpeed ?? 0.004; // Much lower for smoke-like feel
  const starDensity = settings?.starDensity ?? 150;

  const getSeed = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const seed = useMemo(() => getSeed(username), [username]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    const colors =
      palette.length >= 2
        ? palette
        : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main];

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

    let particles: Particle[] = [];
    let stars: Star[] = [];

    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const initScene = (width: number, height: number) => {
      // Init Stars
      const newStars = [];
      for (let i = 0; i < starDensity; i++) {
        newStars.push({
          x: pseudoRandom(i + 5000) * width,
          y: pseudoRandom(i + 6000) * height,
          size: pseudoRandom(i + 7000) * 1.5,
          opacity: 0.1 + pseudoRandom(i + 8000) * 0.5,
        });
      }

      // Init Gas Clusters
      const newParticles = [];
      const clusterCount = colors.length * 3; // More clusters
      const groupCenters = Array.from({ length: clusterCount }).map((_, i) => ({
        x: (pseudoRandom(i * 15) * 0.8 + 0.1) * width,
        y: (pseudoRandom(i * 25 + 7) * 0.8 + 0.1) * height,
      }));

      for (let i = 0; i < particleCount; i++) {
        const clusterIdx = i % clusterCount;
        const colorIdx = clusterIdx % colors.length;
        const center = groupCenters[clusterIdx];
        const angle = pseudoRandom(i + 100) * Math.PI * 2;
        const dist = pseudoRandom(i + 200) * (width * 0.12);
        const bx = center.x + Math.cos(angle) * dist;
        const by = center.y + Math.sin(angle) * dist;

        newParticles.push({
          x: bx,
          y: by,
          baseX: bx,
          baseY: by,
          vx: 0,
          vy: 0,
          size: 40 + pseudoRandom(i + 300) * 80, // Larger, softer blobs
          color: colors[colorIdx],
          alpha: 0,
          targetAlpha: 0.05 + pseudoRandom(i + 400) * 0.15,
          phase: pseudoRandom(i + 500) * Math.PI * 2,
        });
      }
      return { stars: newStars, particles: newParticles };
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
        const scene = initScene(rect.width, rect.height);
        stars = scene.stars;
        particles = scene.particles;
      }
    };

    const resizeObserver = new ResizeObserver(() => resize());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    resize();

    const mouse = { x: -1000, y: -1000, px: -1000, py: -1000, down: false };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseDown = () => {
      mouse.down = true;
    };
    const handleMouseUp = () => {
      mouse.down = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mousedown', handleMouseDown);
      parent.addEventListener('mouseup', handleMouseUp);
      parent.addEventListener('mouseleave', () => {
        mouse.x = -1000;
        mouse.y = -1000;
        mouse.down = false;
      });
    }

    let time = 0;
    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      if (!width || !height) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Dynamic Celestial Background
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
        // Vibrant Deep Primary for light mode - but dark enough for glowing gas to pop
        skyGrad.addColorStop(0, alpha(colors[colors.length - 1], 0.7));
        skyGrad.addColorStop(0.5, alpha(colors[colors.length - 1], 0.9));
        skyGrad.addColorStop(1, alpha(colors[colors.length - 1], 1.0));
      } else {
        // True Deep Space with visible tints for dark mode
        skyGrad.addColorStop(0, '#1a1a3a'); // More blue/purple tint
        skyGrad.addColorStop(0.5, '#0a0a1a');
        skyGrad.addColorStop(1, '#050508');
      }

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Distant Stars
      ctx.fillStyle = '#fff';
      stars.forEach((s) => {
        ctx.globalAlpha = s.opacity * (0.7 + Math.sin(time * 2 + s.x) * 0.3);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      time += speed;

      // 3. Draw Gas Clouds
      particles.forEach((p) => {
        // Restoration Force (Airy return)
        const dxBase = p.baseX - p.x;
        const dyBase = p.baseY - p.y;
        p.vx += dxBase * returnSpeed;
        p.vy += dyBase * returnSpeed;

        // Mouse Interaction (Airy Smear)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < smearRadius) {
          const force = (smearRadius - dist) / smearRadius;
          if (mouse.down) {
            // High turbulence on click
            const angle = Math.atan2(dy, dx);
            p.vx += Math.cos(angle + Math.PI / 2) * turbulenceStrength * 2;
            p.vy += Math.sin(angle + Math.PI / 2) * turbulenceStrength * 2;
          } else {
            // Smoke-like smear
            const mdx = mouse.x - mouse.px;
            const mdy = mouse.y - mouse.py;
            p.vx += mdx * force * 0.15;
            p.vy += mdy * force * 0.15;
            p.vx -= (dx / dist) * force * 0.8;
            p.vy -= (dy / dist) * force * 0.8;
          }
        }

        // Smooth drift
        p.vx += Math.sin(time + p.phase) * 0.03;
        p.vy += Math.cos(time * 0.8 + p.phase) * 0.03;

        // High friction for gas feel
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;

        if (p.alpha < p.targetAlpha) p.alpha += 0.001;

        // Render as very soft additive blob
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
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mousedown', handleMouseDown);
        parent.removeEventListener('mouseup', handleMouseUp);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    seed,
    palette,
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
        zIndex: 1,
      }}
    />
  );
};

export default NebulaBanner;
