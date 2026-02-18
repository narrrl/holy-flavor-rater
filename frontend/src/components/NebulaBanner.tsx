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
    };
}

const NebulaBanner: React.FC<NebulaBannerProps> = ({ username, palette, ratingsCount, followersCount, settings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = useTheme();
    
    const particleCount = settings?.particleCount ?? Math.min(150 + Math.floor(ratingsCount * 2), 300);
    const speed = settings?.speed ?? 0.002;
    const globalOpacity = settings?.opacity ?? 0.8;
    const attractionForce = settings?.attractionForce ?? 0.15;

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
            offset: number;
        }

        let particles: Particle[] = [];
        
        const pseudoRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        const initParticles = (width: number, height: number) => {
            const newParticles = [];
            for (let i = 0; i < particleCount; i++) {
                newParticles.push({
                    x: pseudoRandom(i) * width,
                    y: pseudoRandom(i + 500) * height,
                    vx: (pseudoRandom(i + 1000) - 0.5) * 0.5,
                    vy: (pseudoRandom(i + 1500) - 0.5) * 0.5,
                    size: 2 + pseudoRandom(i + 2000) * 8,
                    color: colors[i % colors.length],
                    alpha: 0,
                    targetAlpha: 0.1 + pseudoRandom(i + 2500) * 0.4,
                    phase: pseudoRandom(i + 3000) * Math.PI * 2,
                    offset: pseudoRandom(i + 3500) * 100
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
            
            // Nebula Background Gradient (Darker tone of the primary color)
            const bgGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/1.2);
            bgGrad.addColorStop(0, alpha(theme.palette.background.paper, 0.4));
            bgGrad.addColorStop(1, alpha('#000', 0.8));
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            time += speed;

            particles.forEach((p) => {
                // Organic Movement (Cloud-like)
                const noiseX = Math.sin(time + p.phase) * 0.5;
                const noiseY = Math.cos(time * 0.8 + p.phase) * 0.5;
                
                p.vx += noiseX * 0.01;
                p.vy += noiseY * 0.01;

                // Mouse Interaction
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 250) {
                    if (mouse.down) {
                        // Pull in effect
                        p.vx += (dx / dist) * attractionForce;
                        p.vy += (dy / dist) * attractionForce;
                    } else {
                        // Disturbance / Swirl effect
                        const angle = Math.atan2(dy, dx);
                        p.vx += Math.cos(angle + Math.PI/2) * 0.05;
                        p.vy += Math.sin(angle + Math.PI/2) * 0.05;
                    }
                }

                // Friction
                p.vx *= 0.96;
                p.vy *= 0.96;

                p.x += p.vx;
                p.y += p.vy;

                // Screen Wrap
                if (p.x < -50) p.x = width + 50;
                if (p.x > width + 50) p.x = -50;
                if (p.y < -50) p.y = height + 50;
                if (p.y > height + 50) p.y = -50;

                // Fade in
                if (p.alpha < p.targetAlpha) p.alpha += 0.005;

                // Draw Particle (Nebula blob)
                const pOpacity = p.alpha * globalOpacity * (0.6 + Math.sin(time * 2 + p.offset) * 0.4);
                
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
                grad.addColorStop(0, alpha(p.color, pOpacity));
                grad.addColorStop(0.5, alpha(p.color, pOpacity * 0.3));
                grad.addColorStop(1, alpha(p.color, 0));
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
                ctx.fill();
            });

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
    }, [username, palette, ratingsCount, followersCount, theme, particleCount, speed, globalOpacity, attractionForce]);

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
                mixBlendMode: 'screen'
            }} 
        />
    );
};

export default NebulaBanner;
