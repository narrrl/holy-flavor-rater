import React, { useRef, useEffect, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';

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

const HextechBanner: React.FC<HextechBannerProps> = ({ username, palette, settings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = useTheme();
    
    const gridSize = settings?.gridSize ?? 40;
    const pulseSpeed = settings?.pulseSpeed ?? 0.02;
    const glowIntensity = settings?.glowIntensity ?? 0.8;
    const streamCount = settings?.streamCount ?? 12;
    const distortionFactor = settings?.distortion ?? 0.5;

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
        let time = 0;

        const pseudoRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        // Mana Stream Logic
        interface Stream {
            segments: { x: number, y: number }[];
            color: string;
            life: number;
            speed: number;
        }

        let streams: Stream[] = [];

        const createStream = (width: number, height: number) => {
            const color = brightColors[Math.floor(pseudoRandom(time) * brightColors.length)];
            let x = pseudoRandom(time + 1) * width;
            let y = pseudoRandom(time + 2) * height;
            
            return {
                segments: [{ x, y }],
                color,
                life: 1.0,
                speed: 2 + pseudoRandom(time + 3) * 4
            };
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

        const draw = () => {
            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);
            if (!width || !height) {
                animationFrameId = requestAnimationFrame(draw);
                return;
            }

            ctx.clearRect(0, 0, width, height);
            
            // Background
            const isLight = theme.palette.mode === 'light';
            const bgGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
            if (isLight) {
                bgGrad.addColorStop(0, alpha(brightColors[0], 0.4));
                bgGrad.addColorStop(1, alpha(brightColors[0], 0.9));
            } else {
                bgGrad.addColorStop(0, '#0a051a'); // Arcane Purple tint
                bgGrad.addColorStop(1, '#020105');
            }
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            time += pulseSpeed;

            // 1. Draw Hex Grid
            ctx.lineWidth = 1;
            const h = gridSize * Math.sqrt(3);
            const w = gridSize * 2;
            
            for (let y = -gridSize; y < height + gridSize; y += h/2) {
                for (let x = -gridSize; x < width + gridSize; x += w * 0.75) {
                    const xOffset = (Math.floor(y / (h/2)) % 2 === 0) ? 0 : w * 0.375;
                    const finalX = x + xOffset;
                    const finalY = y;

                    // Apply Trippiness (Distortion)
                    const dist = Math.sqrt(Math.pow(finalX - mouse.x, 2) + Math.pow(finalY - mouse.y, 2));
                    const mouseImpact = Math.max(0, (200 - dist) / 200) * (mouse.down ? 2 : 1);
                    
                    const dx = Math.sin(time + (finalX * 0.01)) * gridSize * distortionFactor * (1 + mouseImpact);
                    const dy = Math.cos(time + (finalY * 0.01)) * gridSize * distortionFactor * (1 + mouseImpact);

                    const drawX = finalX + dx;
                    const drawY = finalY + dy;

                    // Pulse glow
                    const pulseVal = 0.1 + Math.sin(time * 2 + (finalX + finalY) * 0.005) * 0.1;
                    const opacity = (0.1 + pulseVal + mouseImpact * 0.3) * glowIntensity;

                    ctx.strokeStyle = alpha(brightColors[0], opacity);
                    drawHexagon(drawX, drawY, gridSize * 0.9, time * 0.1);
                    ctx.stroke();

                    // Occasional Runes
                    if (pseudoRandom(Math.floor(finalX) + Math.floor(finalY)) > 0.92) {
                        ctx.fillStyle = alpha(brightColors[1], opacity * 0.5);
                        ctx.font = `${gridSize * 0.5}px serif`;
                        ctx.fillText("⚡", drawX - 5, drawY + 5);
                    }
                }
            }

            // 2. Process Mana Streams
            if (streams.length < streamCount && Math.random() > 0.9) {
                streams.push(createStream(width, height));
            }

            ctx.globalCompositeOperation = 'screen';
            streams.forEach((s, idx) => {
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

            streams = streams.filter(s => s.life > 0);

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
    }, [seed, brightColors, gridSize, pulseSpeed, glowIntensity, streamCount, distortionFactor, theme]);

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

export default HextechBanner;
