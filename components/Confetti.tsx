'use client';

import { useEffect, useRef } from 'react';

const COLORS = [
  '#3B82F6', '#6366F1', '#8B5CF6',
  '#10B981', '#F59E0B', '#EC4899',
  '#FCD34D', '#34D399', '#F87171',
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  w: number; h: number;
  rot: number; rotSpeed: number;
  gravity: number;
  alpha: number;
  shape: 'rect' | 'circle';
}

function spawnParticles(cw: number, ch: number): Particle[] {
  // Three burst origins spread horizontally at ~55% height
  const origins = [cw * 0.3, cw * 0.5, cw * 0.7];
  const perOrigin = 35;

  return origins.flatMap((ox) =>
    Array.from({ length: perOrigin }, () => ({
      x: ox + (Math.random() - 0.5) * 40,
      y: ch * 0.55 + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 14,
      vy: -(Math.random() * 13 + 7),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      w: Math.random() * 9 + 4,
      h: Math.random() * 5 + 3,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 11,
      gravity: 0.22 + Math.random() * 0.18,
      alpha: 1,
      shape: Math.random() > 0.55 ? 'circle' : 'rect',
    })),
  );
}

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = spawnParticles(canvas.width, canvas.height);
    const DURATION  = 2800;
    const FADE_START = 1600;
    let start: number | null = null;
    let rafId: number;

    const draw = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.vy  += p.gravity;
        p.x   += p.vx;
        p.y   += p.vy;
        p.rot += p.rotSpeed;
        p.alpha = elapsed < FADE_START
          ? 1
          : Math.max(0, 1 - (elapsed - FADE_START) / (DURATION - FADE_START));

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      }

      if (elapsed < DURATION) {
        rafId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}
