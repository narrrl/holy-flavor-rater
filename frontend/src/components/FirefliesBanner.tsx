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
    const baseSpeed = settings?.speed ?? 0.8; // Slower default cruise
    const evasionRadius = settings?.evasionRadius ?? 180;
    const evasionStrength = settings?.evasionStrength ?? 0.6; // High evasion
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

    const brightColors = useMemo(() => {
        const colors = palette.length >= 2 ? palette : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main];
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
                    noiseOffset: pseudoRandom(i + 3000) * 100,
                    isEvading: false
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
            
            // Vibrant theme-aware night sky background
            const isLight = theme.palette.mode === 'light';
            const bgGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
            if (isLight) {
                bgGrad.addColorStop(0, alpha(brightColors[0], 0.5));
                bgGrad.addColorStop(1, alpha(brightColors[0], 0.95));
            } else {
                bgGrad.addColorStop(0, '#141a2a'); // Noticeable blue-grey tint
                bgGrad.addColorStop(1, '#05080f');
            }
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            time += flickerSpeed;

            swarm.forEach((f, i) => {
                // 1. Autonomous Chaotic Movement (Perlin + Jitter)
                const driftX = Math.sin(time * 0.5 + f.noiseOffset) * 0.05;
                const driftY = Math.cos(time * 0.4 + f.noiseOffset) * 0.05;
                
                // High-frequency jitter for insect feel
                const jitterX = (pseudoRandom(i + time * 10) - 0.5) * 0.2;
                const jitterY = (pseudoRandom(i + 500 + time * 10) - 0.5) * 0.2;

                f.vx += driftX + jitterX;
                f.vy += driftY + jitterY;

                // 2. Mouse Evasion (Fast Dash)
                const dx = mouse.x - f.x;
                const dy = mouse.y - f.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                f.isEvading = dist < evasionRadius;
                if (f.isEvading) {
                    const force = (evasionRadius - dist) / evasionRadius;
                    const angle = Math.atan2(dy, dx);
                    // Sharp acceleration away
                    f.vx -= Math.cos(angle) * force * evasionStrength * 1.5;
                    f.vy -= Math.sin(angle) * force * evasionStrength * 1.5;
                }

                // 3. Dynamic Speed Limits
                const currentSpeed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
                const maxSpeed = f.isEvading ? baseSpeed * 10 : baseSpeed * 1.5;
                
                if (currentSpeed > maxSpeed) {
                    f.vx = (f.vx / currentSpeed) * maxSpeed;
                    f.vy = (f.vy / currentSpeed) * maxSpeed;
                }

                // 4. Smooth Friction
                f.vx *= 0.97;
                f.vy *= 0.97;

                f.x += f.vx;
                f.y += f.vy;

                // Screen Wrap
                const margin = 20;
                if (f.x < -margin) f.x = width + margin;
                if (f.x > width + margin) f.x = -margin;
                if (f.y < -margin) f.y = height + margin;
                if (f.y > height + margin) f.y = -margin;

                // Flicker
                const flicker = 0.4 + Math.sin(time + f.phase) * 0.6;
                const opacity = flicker > 0 ? flicker : 0;

                // Render
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
    }, [seed, brightColors, count, baseSpeed, evasionRadius, evasionStrength, glowSizeMultiplier, flickerSpeed, theme]);

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
