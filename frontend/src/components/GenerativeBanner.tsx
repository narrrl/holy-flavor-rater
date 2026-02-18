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
        
        const nodeCount = Math.min(12 + Math.floor(ratingsCount / 4), 30);
        const speedMultiplier = 0.15 + (Math.min(followersCount, 50) / 120);
        
        const colors = palette.length > 0 ? palette : [theme.palette.primary.main, theme.palette.secondary.main];

        interface Node {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            size: number;
        }

        const nodes: Node[] = [];
        
        const pseudoRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };

        window.addEventListener('resize', resize);
        resize();

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: pseudoRandom(i) * canvas.width,
                y: pseudoRandom(i + nodeCount) * canvas.height,
                vx: (pseudoRandom(i + 2) - 0.5) * speedMultiplier,
                vy: (pseudoRandom(i + 3) - 0.5) * speedMultiplier,
                color: colors[i % colors.length],
                size: 1 + pseudoRandom(i + 4) * 3
            });
        }

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

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('touchstart', (e) => { mouse.down = true; handleTouchMove(e); });
        canvas.addEventListener('touchend', handleMouseUp);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            nodes.forEach((node) => {
                node.x += node.vx;
                node.y += node.vy;

                if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

                const dx = mouse.x - node.x;
                const dy = mouse.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = mouse.down ? 400 : 200;

                if (dist < maxDist) {
                    const force = (maxDist - dist) / maxDist;
                    const strength = mouse.down ? 0.2 : 0.08;
                    // Pull when down, repel when hovering
                    if (mouse.down) {
                        node.x += dx * force * strength;
                        node.y += dy * force * strength;
                    } else {
                        node.x -= dx * force * strength;
                        node.y -= dy * force * strength;
                    }
                }
            });

            // Draw connections and triangles
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const ddist = Math.sqrt(Math.pow(nodes[i].x - nodes[j].x, 2) + Math.pow(nodes[i].y - nodes[j].y, 2));
                    
                    if (ddist < 150) {
                        // Lines
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = alpha(nodes[i].color, (1 - ddist / 150) * 0.15);
                        ctx.stroke();

                        // Search for a third point to make a triangle
                        for (let k = j + 1; k < nodes.length; k++) {
                            const ddist2 = Math.sqrt(Math.pow(nodes[j].x - nodes[k].x, 2) + Math.pow(nodes[j].y - nodes[k].y, 2));
                            const ddist3 = Math.sqrt(Math.pow(nodes[i].x - nodes[k].x, 2) + Math.pow(nodes[i].y - nodes[k].y, 2));

                            if (ddist2 < 150 && ddist3 < 150) {
                                ctx.beginPath();
                                ctx.moveTo(nodes[i].x, nodes[i].y);
                                ctx.lineTo(nodes[j].x, nodes[j].y);
                                ctx.lineTo(nodes[k].x, nodes[k].y);
                                ctx.closePath();
                                ctx.fillStyle = alpha(nodes[i].color, 0.03);
                                ctx.fill();
                            }
                        }
                    }
                }
            }

            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                ctx.fillStyle = alpha(node.color, 0.4);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('touchend', handleMouseUp);
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
                width: '100%', 
                height: '100%',
                pointerEvents: 'auto'
            }} 
        />
    );
};

export default GenerativeBanner;
