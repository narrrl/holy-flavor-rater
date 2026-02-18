import React, { useRef, useEffect } from 'react';
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
        attractionForce?: number;
        cloudSize?: number;
    };
}

const NebulaBanner: React.FC<NebulaBannerProps> = ({ username, palette, ratingsCount, followersCount, settings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = useTheme();
    
    // Cloud settings for high density
    const particleCount = settings?.particleCount ?? 250;
    const speed = settings?.speed ?? 0.003;
    const globalOpacity = settings?.opacity ?? 0.85;
    const attractionForce = settings?.attractionForce ?? 0.25;
    const cloudSizeMultiplier = settings?.cloudSize ?? 12; // Much larger for cloud feel

    const getSeed = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        const seed = getSeed(username);
        const colors = palette.length >= 2 ? palette : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main];

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            alpha: number;
            targetAlpha: number;
            phase: number;
            pulse: number;
            pulseSpeed: number;
        }

        let particles: Particle[] = [];
        let bgClouds: Particle[] = [];
        
        const pseudoRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        const initParticles = (width: number, height: number) => {
            const p = [];
            const bg = [];
            
            // Foreground Active Gas
            for (let i = 0; i < particleCount; i++) {
                p.push({
                    x: pseudoRandom(i) * width,
                    y: pseudoRandom(i + 500) * height,
                    vx: 0, vy: 0,
                    size: (5 + pseudoRandom(i + 1000) * 15) * cloudSizeMultiplier,
                    color: colors[i % colors.length],
                    alpha: 0,
                    targetAlpha: 0.05 + pseudoRandom(i + 1500) * 0.15,
                    phase: pseudoRandom(i + 2000) * Math.PI * 2,
                    pulse: pseudoRandom(i + 2500),
                    pulseSpeed: 0.005 + pseudoRandom(i + 3000) * 0.01
                });
            }

            // Static background cloud layers for density
            for (let i = 0; i < 15; i++) {
                bg.push({
                    x: pseudoRandom(i + 4000) * width,
                    y: pseudoRandom(i + 4500) * height,
                    vx: 0, vy: 0,
                    size: (40 + pseudoRandom(i + 5000) * 60) * (cloudSizeMultiplier / 4),
                    color: colors[i % colors.length],
                    alpha: 0.02 + pseudoRandom(i + 5500) * 0.05,
                    targetAlpha: 0, phase: 0, pulse: 0, pulseSpeed: 0
                });
            }
            return { p, bg };
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
                const { p, bg } = initParticles(rect.width, rect.height);
                particles = p;
                bgClouds = bg;
            }
        };

        const resizeObserver = new ResizeObserver(() => resize());
        if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
        resize();

        let mouse = { x: -1000, y: -1000, down: false };
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };
        const handleMouseDown = () => { mouse.down = true; };
        const handleMouseUp = () => { mouse.down = false; };

        const parent = canvas.parentElement;
        if (parent) {
            parent.addEventListener('mousemove', handleMouseMove);
            parent.addEventListener('mousedown', handleMouseDown);
            parent.addEventListener('mouseup', handleMouseUp);
            parent.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; mouse.down = false; });
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
            
            // Deep Space Background
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, width, height);

            time += speed;

            // Draw Background atmospheric clouds first
            bgClouds.forEach(c => {
                const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size);
                g.addColorStop(0, alpha(c.color, c.alpha));
                g.addColorStop(1, alpha(c.color, 0));
                ctx.fillStyle = g;
                ctx.fillRect(c.x - c.size, c.y - c.size, c.size * 2, c.size * 2);
            });

            // Process and Draw Active Gas Particles
            particles.forEach((p) => {
                // Organic Drift
                const driftX = Math.sin(time + p.phase) * 0.2;
                const driftY = Math.cos(time * 0.7 + p.phase) * 0.2;
                p.vx += driftX;
                p.vy += driftY;

                // Mouse Interaction (Fluid feel)
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 300) {
                    if (mouse.down) {
                        // Condense / Gravity Pull
                        const force = (300 - dist) / 300;
                        p.vx += (dx / dist) * attractionForce * force;
                        p.vy += (dy / dist) * attractionForce * force;
                    } else {
                        // Swirl / Turbulence
                        const swirl = (300 - dist) / 300;
                        p.vx += (dy / dist) * 0.15 * swirl;
                        p.vy -= (dx / dist) * 0.15 * swirl;
                    }
                }

                p.vx *= 0.94;
                p.vy *= 0.94;
                p.x += p.vx;
                p.y += p.vy;

                // Screen Wrap
                const margin = p.size;
                if (p.x < -margin) p.x = width + margin;
                if (p.x > width + margin) p.x = -margin;
                if (p.y < -margin) p.y = height + margin;
                if (p.y > height + margin) p.y = -margin;

                // Pulsing Alpha
                p.pulse += p.pulseSpeed;
                const currentAlpha = p.targetAlpha * (0.5 + Math.sin(p.pulse) * 0.5);
                
                // Render as additive cloud blob
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                const colorAlpha = currentAlpha * globalOpacity;
                
                grad.addColorStop(0, alpha(p.color, colorAlpha));
                grad.addColorStop(0.4, alpha(p.color, colorAlpha * 0.4));
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
    }, [username, palette, ratingsCount, followersCount, theme, particleCount, speed, globalOpacity, attractionForce, cloudSizeMultiplier]);

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

export default NebulaBanner;
