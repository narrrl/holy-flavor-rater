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
        smearRadius?: number;
        turbulence?: number;
        cohesion?: number;
        returnSpeed?: number;
    };
}

const NebulaBanner: React.FC<NebulaBannerProps> = ({ username, palette, ratingsCount, followersCount, settings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = useTheme();
    
    const particleCount = settings?.particleCount ?? 300;
    const speed = settings?.speed ?? 0.002;
    const globalOpacity = settings?.opacity ?? 0.7;
    const smearRadius = settings?.smearRadius ?? 100;
    const turbulenceStrength = settings?.turbulence ?? 0.5;
    const cohesion = settings?.cohesion ?? 0.02;
    const returnSpeed = settings?.returnSpeed ?? 0.01;

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
            baseX: number;
            baseY: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            alpha: number;
            targetAlpha: number;
            group: number;
        }

        let particles: Particle[] = [];
        
        const pseudoRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        const initParticles = (width: number, height: number) => {
            const newParticles = [];
            const groupCenters = colors.map((_, i) => ({
                x: (pseudoRandom(i * 10) * 0.6 + 0.2) * width,
                y: (pseudoRandom(i * 20 + 5) * 0.6 + 0.2) * height
            }));

            for (let i = 0; i < particleCount; i++) {
                const groupIdx = i % colors.length;
                const center = groupCenters[groupIdx];
                const angle = pseudoRandom(i + 100) * Math.PI * 2;
                const dist = pseudoRandom(i + 200) * (width * 0.15);
                const bx = center.x + Math.cos(angle) * dist;
                const by = center.y + Math.sin(angle) * dist;

                newParticles.push({
                    x: bx, y: by,
                    baseX: bx, baseY: by,
                    vx: 0, vy: 0,
                    size: 20 + pseudoRandom(i + 300) * 40,
                    color: colors[groupIdx],
                    alpha: 0,
                    targetAlpha: 0.1 + pseudoRandom(i + 400) * 0.2,
                    group: groupIdx
                });
            }
            return newParticles;
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
                particles = initParticles(rect.width, rect.height);
            }
        };

        const resizeObserver = new ResizeObserver(() => resize());
        if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
        resize();

        let mouse = { x: -1000, y: -1000, px: -1000, py: -1000, down: false };
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.px = mouse.x;
            mouse.py = mouse.y;
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
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, width, height);

            time += speed;

            particles.forEach((p) => {
                // Restoration Force - Pulls back to group center
                const dxBase = p.baseX - p.x;
                const dyBase = p.baseY - p.y;
                p.vx += dxBase * returnSpeed;
                p.vy += dyBase * returnSpeed;

                // Mouse Smear / Path Carving
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < smearRadius) {
                    const force = (smearRadius - dist) / smearRadius;
                    
                    if (mouse.down) {
                        // Turbulence on click: Swirl + Random jitter
                        const angle = Math.atan2(dy, dx);
                        p.vx += Math.cos(angle + Math.PI/2) * turbulenceStrength;
                        p.vy += Math.sin(angle + Math.PI/2) * turbulenceStrength;
                        p.vx += (pseudoRandom(p.x + time) - 0.5) * turbulenceStrength;
                        p.vy += (pseudoRandom(p.y + time) - 0.5) * turbulenceStrength;
                    } else {
                        // Smear: Push away from mouse movement direction
                        const mdx = mouse.x - mouse.px;
                        const mdy = mouse.y - mouse.py;
                        p.vx += mdx * force * 0.2;
                        p.vy += mdy * force * 0.2;
                        // Extra push away to "carve"
                        p.vx -= (dx / dist) * force * 2;
                        p.vy -= (dy / dist) * force * 2;
                    }
                }

                // Internal drift
                p.vx += Math.sin(time + p.x * 0.01) * 0.05;
                p.vy += Math.cos(time + p.y * 0.01) * 0.05;

                // Friction
                p.vx *= 0.92;
                p.vy *= 0.92;

                p.x += p.vx;
                p.y += p.vy;

                // Screen Wrap
                const margin = p.size;
                if (p.x < -margin) p.x = width + margin;
                if (p.x > width + margin) p.x = -margin;
                if (p.y < -margin) p.y = height + margin;
                if (p.y > height + margin) p.y = -margin;

                if (p.alpha < p.targetAlpha) p.alpha += 0.002;

                // Render
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                const colorAlpha = p.alpha * globalOpacity * (0.7 + Math.sin(time * 2 + p.x) * 0.3);
                
                grad.addColorStop(0, alpha(p.color, colorAlpha));
                grad.addColorStop(0.5, alpha(p.color, colorAlpha * 0.3));
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
    }, [username, palette, ratingsCount, followersCount, theme, particleCount, speed, globalOpacity, smearRadius, turbulenceStrength, cohesion, returnSpeed]);

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
