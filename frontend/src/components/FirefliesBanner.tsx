import React, { useRef, useEffect, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';

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

const FirefliesBanner: React.FC<FirefliesBannerProps> = ({ username, palette, settings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = useTheme();
    
    const count = settings?.count ?? 150;
    const baseSpeed = settings?.speed ?? 1.5;
    const evasionRadius = settings?.evasionRadius ?? 150;
    const evasionStrength = settings?.evasionStrength ?? 0.2;
    const glowSizeMultiplier = settings?.glowSize ?? 4;
    const flickerSpeed = settings?.flickerSpeed ?? 0.05;

    const getSeed = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    };

    const seed = useMemo(() => getSeed(username), [username]);

    // Filter for bright colors only
    const brightColors = useMemo(() => {
        const colors = palette.length >= 2 ? palette : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main];
        
        // Simple brightness heuristic: sum of RGB (very rough but works for hex)
        const getBrightness = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) || 0;
            const g = parseInt(hex.slice(3, 5), 16) || 0;
            const b = parseInt(hex.slice(5, 7), 16) || 0;
            return (r * 299 + g * 587 + b * 114) / 1000;
        };

        const sorted = [...colors].sort((a, b) => getBrightness(b) - getBrightness(a));
        return sorted.slice(0, 3); // Take the top 3 brightest
    }, [palette, theme]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;

        interface Firefly {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            phase: number;
            noiseOffset: number;
        }

        let swarm: Firefly[] = [];
        
        const pseudoRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        const initSwarm = (width: number, height: number) => {
            const newSwarm = [];
            for (let i = 0; i < count; i++) {
                newSwarm.push({
                    x: pseudoRandom(i) * width,
                    y: pseudoRandom(i + 500) * height,
                    vx: (pseudoRandom(i + 1000) - 0.5) * baseSpeed,
                    vy: (pseudoRandom(i + 1500) - 0.5) * baseSpeed,
                    size: 1 + pseudoRandom(i + 2000) * 2,
                    color: brightColors[i % brightColors.length],
                    phase: pseudoRandom(i + 2500) * Math.PI * 2,
                    noiseOffset: pseudoRandom(i + 3000) * 100
                });
            }
            return newSwarm;
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
                swarm = initSwarm(rect.width, rect.height);
            }
        };

        const resizeObserver = new ResizeObserver(() => resize());
        if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
        resize();

        let mouse = { x: -1000, y: -1000 };
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const parent = canvas.parentElement;
        if (parent) {
            parent.addEventListener('mousemove', handleMouseMove);
            parent.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });
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
            
            // Subtle forest night background
            ctx.fillStyle = '#020408';
            ctx.fillRect(0, 0, width, height);

            time += flickerSpeed;

            swarm.forEach((f) => {
                // 1. Autonomous Chaotic Movement (Perlin-lite)
                f.vx += Math.sin(time * 0.5 + f.noiseOffset) * 0.1;
                f.vy += Math.cos(time * 0.4 + f.noiseOffset) * 0.1;

                // 2. Mouse Evasion
                const dx = mouse.x - f.x;
                const dy = mouse.y - f.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < evasionRadius) {
                    const force = (evasionRadius - dist) / evasionRadius;
                    const angle = Math.atan2(dy, dx);
                    // Push away
                    f.vx -= Math.cos(angle) * force * evasionStrength * 5;
                    f.vy -= Math.sin(angle) * force * evasionStrength * 5;
                }

                // Limit speed
                const speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
                const maxSpeed = baseSpeed * 2;
                if (speed > maxSpeed) {
                    f.vx = (f.vx / speed) * maxSpeed;
                    f.vy = (f.vy / speed) * maxSpeed;
                }

                // Apply friction
                f.vx *= 0.98;
                f.vy *= 0.98;

                f.x += f.vx;
                f.y += f.vy;

                // Screen Wrap
                if (f.x < -20) f.x = width + 20;
                if (f.x > width + 20) f.x = -20;
                if (f.y < -20) f.y = height + 20;
                if (f.y > height + 20) f.y = -20;

                // 3. Flicker Logic
                const flicker = 0.4 + Math.sin(time + f.phase) * 0.6;
                const opacity = flicker > 0 ? flicker : 0;

                // 4. Render Glow
                const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * glowSizeMultiplier);
                grad.addColorStop(0, alpha(f.color, opacity));
                grad.addColorStop(0.4, alpha(f.color, opacity * 0.3));
                grad.addColorStop(1, alpha(f.color, 0));
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.size * glowSizeMultiplier, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = alpha('#fff', opacity * 0.8);
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

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
    }, [seed, brightColors, count, baseSpeed, evasionRadius, evasionStrength, glowSizeMultiplier, flickerSpeed]);

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
                zIndex: 1
            }} 
        />
    );
};

export default FirefliesBanner;
