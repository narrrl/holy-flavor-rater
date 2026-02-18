import React, { useRef, useEffect } from 'react';
import { alpha, useTheme } from '@mui/material';

interface GenerativeBannerProps {
    username: string;
    palette: string[];
    ratingsCount: number;
    followersCount: number;
}

const GenerativeBanner: React.FC<GenerativeBannerProps> = ({ username, palette, ratingsCount, followersCount }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = useTheme();
    
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

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const seed = getSeed(username);
        
        // Dynamic count and speed
        const nodeCount = Math.min(20 + Math.floor(ratingsCount / 2), 50);
        const speedMultiplier = 0.25 + (Math.min(followersCount, 50) / 80);
        
        // Prefer vibrant colors
        const colors = palette.length >= 2 ? palette : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main];

        interface Node {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            size: number;
        }

        let nodes: Node[] = [];
        
        const pseudoRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        const initNodes = (width: number, height: number) => {
            const newNodes = [];
            for (let i = 0; i < nodeCount; i++) {
                newNodes.push({
                    x: pseudoRandom(i) * width,
                    y: pseudoRandom(i + 100) * height,
                    vx: (pseudoRandom(i + 200) - 0.5) * speedMultiplier,
                    vy: (pseudoRandom(i + 300) - 0.5) * speedMultiplier,
                    color: colors[i % colors.length],
                    size: 2 + pseudoRandom(i + 400) * 5
                });
            }
            return newNodes;
        };

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                const rect = parent.getBoundingClientRect();
                // Scale for high DPI
                const dpr = window.devicePixelRatio || 1;
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
                // Adjust CSS display size
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;
                
                nodes = initNodes(rect.width, rect.height);
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

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                const rect = canvas.getBoundingClientRect();
                mouse.x = e.touches[0].clientX - rect.left;
                mouse.y = e.touches[0].clientY - rect.top;
            }
        };

        const handleMouseDown = () => mouse.down = true;
        const handleMouseUp = () => mouse.down = false;

        // Attach to window for better tracking
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        const draw = () => {
            // Get CSS dimensions for drawing
            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);
            
            if (!width || !height) {
                animationFrameId = requestAnimationFrame(draw);
                return;
            }

            ctx.clearRect(0, 0, width, height);
            
            nodes.forEach((node) => {
                node.x += node.vx;
                node.y += node.vy;

                if (node.x < 0 || node.x > width) node.vx *= -1;
                if (node.y < 0 || node.y > height) node.vy *= -1;

                const dx = mouse.x - node.x;
                const dy = mouse.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = mouse.down ? 400 : 200;

                if (dist < maxDist) {
                    const force = (maxDist - dist) / maxDist;
                    const strength = mouse.down ? 0.2 : 0.08;
                    if (mouse.down) {
                        node.x += dx * force * strength;
                        node.y += dy * force * strength;
                    } else {
                        node.x -= dx * force * strength;
                        node.y -= dy * force * strength;
                    }
                }
            });

            // Draw mesh connections
            ctx.lineWidth = 1.5;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const ddist = Math.sqrt(Math.pow(nodes[i].x - nodes[j].x, 2) + Math.pow(nodes[i].y - nodes[j].y, 2));
                    
                    if (ddist < 160) {
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = alpha(nodes[i].color, (1 - ddist / 160) * 0.3);
                        ctx.stroke();

                        for (let k = j + 1; k < nodes.length; k++) {
                            const ddist2 = Math.sqrt(Math.pow(nodes[j].x - nodes[k].x, 2) + Math.pow(nodes[j].y - nodes[k].y, 2));
                            const ddist3 = Math.sqrt(Math.pow(nodes[i].x - nodes[k].x, 2) + Math.pow(nodes[i].y - nodes[k].y, 2));

                            if (ddist2 < 160 && ddist3 < 160) {
                                ctx.beginPath();
                                ctx.moveTo(nodes[i].x, nodes[i].y);
                                ctx.lineTo(nodes[j].x, nodes[j].y);
                                ctx.lineTo(nodes[k].x, nodes[k].y);
                                ctx.closePath();
                                ctx.fillStyle = alpha(nodes[i].color, 0.06);
                                ctx.fill();
                            }
                        }
                    }
                }
            }

            // Draw nodes with high-visibility glow
            nodes.forEach(node => {
                // Core
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                ctx.fillStyle = alpha(node.color, 0.8);
                ctx.fill();
                
                // Inner Glow
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2);
                ctx.fillStyle = alpha(node.color, 0.2);
                ctx.fill();

                // Outer Atmosphere
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
                ctx.fillStyle = alpha(node.color, 0.05);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [username, palette, ratingsCount, followersCount, theme]);

    return (
        <canvas 
            ref={canvasRef} 
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                pointerEvents: 'none',
                zIndex: 10,
                mixBlendMode: 'plus-lighter' // Makes it pop against dark backgrounds
            }} 
        />
    );
};

export default GenerativeBanner;
