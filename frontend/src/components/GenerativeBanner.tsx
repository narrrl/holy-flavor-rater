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

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        const seed = getSeed(username);
        
        // Configuration - High density for "complex web" feel
        const nodeCount = Math.min(60 + Math.floor(ratingsCount * 1.5), 120);
        const colors = palette.length >= 2 ? palette : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main];

        interface Node {
            x: number;
            y: number;
            vx: number;
            vy: number;
            baseX: number;
            baseY: number;
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
                const bx = pseudoRandom(i) * width;
                const by = pseudoRandom(i + 100) * height;
                newNodes.push({
                    x: bx, y: by,
                    baseX: bx, baseY: by,
                    vx: 0, vy: 0,
                    color: colors[i % colors.length],
                    size: 1 + pseudoRandom(i + 200) * 3
                });
            }
            return newNodes;
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

        const handleMouseDown = () => { mouse.down = true; };
        const handleMouseUp = () => { mouse.down = false; };

        const parent = canvas.parentElement;
        if (parent) {
            parent.addEventListener('mousemove', handleMouseMove);
            parent.addEventListener('touchmove', handleTouchMove, { passive: false });
            parent.addEventListener('mousedown', handleMouseDown);
            parent.addEventListener('mouseup', handleMouseUp);
            parent.addEventListener('touchstart', (e) => { mouse.down = true; handleTouchMove(e); });
            parent.addEventListener('touchend', handleMouseUp);
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
            
            // Physics Update
            nodes.forEach((node) => {
                // Return force (Elasticity)
                const dxBase = node.baseX - node.x;
                const dyBase = node.baseY - node.y;
                node.vx += dxBase * 0.008;
                node.vy += dyBase * 0.008;

                // Mouse interaction
                const dxMouse = mouse.x - node.x;
                const dyMouse = mouse.y - node.y;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
                
                if (mouse.down) {
                    // Grab and drag effect - wider range
                    const dragDist = 350;
                    if (distMouse < dragDist) {
                        const power = (dragDist - distMouse) / dragDist;
                        node.vx += dxMouse * power * 0.15;
                        node.vy += dyMouse * power * 0.15;
                    }
                } else {
                    // Hover disturbance - pushing effect
                    const hoverDist = 180;
                    if (distMouse < hoverDist) {
                        const power = (hoverDist - distMouse) / hoverDist;
                        node.vx -= dxMouse * power * 0.04;
                        node.vy -= dyMouse * power * 0.04;
                    }
                }

                // Damping (Friction)
                node.vx *= 0.9;
                node.vy *= 0.9;

                // Update Position
                node.x += node.vx;
                node.y += node.vy;
            });

            // Draw Mesh (Connections)
            const connectionDist = 140;
            ctx.lineWidth = 1;
            
            for (let i = 0; i < nodes.length; i++) {
                let currentConnections = 0;
                // We only connect a few to keep it a "web" and not a solid block
                for (let j = i + 1; j < nodes.length && currentConnections < 6; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDist) {
                        currentConnections++;
                        const opacity = (1 - dist / connectionDist) * 0.35;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        
                        // Dynamic gradient for the line
                        const lineGrad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
                        lineGrad.addColorStop(0, alpha(nodes[i].color, opacity));
                        lineGrad.addColorStop(1, alpha(nodes[j].color, opacity));
                        
                        ctx.strokeStyle = lineGrad;
                        ctx.stroke();

                        // Fill some triangles for complexity
                        if (dist < connectionDist * 0.6 && pseudoRandom(i + j) > 0.92) {
                            for (let k = j + 1; k < nodes.length; k++) {
                                const d3x = nodes[i].x - nodes[k].x;
                                const d3y = nodes[i].y - nodes[k].y;
                                if (Math.sqrt(d3x*d3x + d3y*d3y) < connectionDist * 0.6) {
                                    ctx.beginPath();
                                    ctx.moveTo(nodes[i].x, nodes[i].y);
                                    ctx.lineTo(nodes[j].x, nodes[j].y);
                                    ctx.lineTo(nodes[k].x, nodes[k].y);
                                    ctx.closePath();
                                    ctx.fillStyle = alpha(nodes[i].color, 0.04);
                                    ctx.fill();
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Draw Nodes
            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.fill();
                
                // Core glow
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = alpha(node.color, 0.15);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            resizeObserver.disconnect();
            if (parent) {
                parent.removeEventListener('mousemove', handleMouseMove);
                parent.removeEventListener('touchmove', handleTouchMove);
                parent.removeEventListener('mousedown', handleMouseDown);
                parent.removeEventListener('mouseup', handleMouseUp);
                parent.removeEventListener('touchstart', handleMouseDown);
                parent.removeEventListener('touchend', handleMouseUp);
            }
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
                pointerEvents: 'none',
                zIndex: 5,
                mixBlendMode: 'screen'
            }} 
        />
    );
};

export default GenerativeBanner;
