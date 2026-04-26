import React, { useMemo } from 'react';
import { alpha, useTheme } from '@mui/material';
import { CANVAS_STYLE, useCanvasBanner } from './useCanvasBanner';

interface GenerativeBannerProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
  settings?: {
    nodeCountBase?: number;
    connectionDist?: number;
    speed?: number;
    opacity?: number;
  };
}

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

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const GenerativeBanner: React.FC<GenerativeBannerProps> = ({
  username,
  palette,
  ratingsCount,
  followersCount,
  settings,
}) => {
  const theme = useTheme();

  const nodeCountBase = settings?.nodeCountBase ?? 60;
  const connectionDist = settings?.connectionDist ?? 140;
  const speed = settings?.speed ?? 0.005;
  const globalOpacity = settings?.opacity ?? 0.35;

  const seed = useMemo(() => hashString(username), [username]);

  const colors = useMemo(
    () =>
      palette.length >= 2
        ? palette
        : [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main],
    [palette, theme],
  );

  const nodeCount = Math.min(nodeCountBase + Math.floor(ratingsCount * 1.5), 120);

  const ref = useCanvasBanner<{ nodes: Node[] }>({
    init: (width, height) => {
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };
      const nodes: Node[] = [];
      for (let i = 0; i < nodeCount; i++) {
        const bx = pseudoRandom(i) * width;
        const by = pseudoRandom(i + 100) * height;
        nodes.push({
          x: bx,
          y: by,
          baseX: bx,
          baseY: by,
          vx: 0,
          vy: 0,
          color: colors[i % colors.length],
          size: 1 + pseudoRandom(i + 200) * 3,
        });
      }
      return { nodes };
    },
    draw: ({ ctx, width, height, state, mouse }) => {
      const { nodes } = state;
      const pseudoRandom = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
      };

      ctx.clearRect(0, 0, width, height);

      nodes.forEach((node) => {
        const dxBase = node.baseX - node.x;
        const dyBase = node.baseY - node.y;
        node.vx += dxBase * speed;
        node.vy += dyBase * speed;

        const dxMouse = mouse.x - node.x;
        const dyMouse = mouse.y - node.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (mouse.down) {
          const dragDist = 300;
          if (distMouse < dragDist) {
            const power = (dragDist - distMouse) / dragDist;
            node.vx += dxMouse * power * 0.08;
            node.vy += dyMouse * power * 0.08;
          }
        } else {
          const hoverDist = 150;
          if (distMouse < hoverDist) {
            const power = (hoverDist - distMouse) / hoverDist;
            node.vx -= dxMouse * power * 0.02;
            node.vy -= dyMouse * power * 0.02;
          }
        }

        node.vx *= 0.88;
        node.vy *= 0.88;
        node.x += node.vx;
        node.y += node.vy;
      });

      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i++) {
        let currentConnections = 0;
        for (let j = i + 1; j < nodes.length && currentConnections < 6; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            currentConnections++;
            const opacity = (1 - dist / connectionDist) * globalOpacity;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);

            const lineGrad = ctx.createLinearGradient(
              nodes[i].x,
              nodes[i].y,
              nodes[j].x,
              nodes[j].y,
            );
            lineGrad.addColorStop(0, alpha(nodes[i].color, opacity));
            lineGrad.addColorStop(1, alpha(nodes[j].color, opacity));

            ctx.strokeStyle = lineGrad;
            ctx.stroke();

            if (dist < connectionDist * 0.6 && pseudoRandom(i + j) > 0.92) {
              for (let k = j + 1; k < nodes.length; k++) {
                const d3x = nodes[i].x - nodes[k].x;
                const d3y = nodes[i].y - nodes[k].y;
                if (Math.sqrt(d3x * d3x + d3y * d3y) < connectionDist * 0.6) {
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

      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = alpha(node.color, 0.15);
        ctx.fill();
      });
    },
    observeTouch: true,
    deps: [seed, colors, followersCount, theme, nodeCount, connectionDist, speed, globalOpacity],
  });

  return (
    <canvas
      ref={ref}
      style={{
        ...CANVAS_STYLE,
        mixBlendMode: theme.palette.mode === 'light' ? 'multiply' : 'screen',
      }}
    />
  );
};

export default GenerativeBanner;
