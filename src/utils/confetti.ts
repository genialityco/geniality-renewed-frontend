// Confeti en un canvas a pantalla completa, por encima de los modales. Sin
// dependencias; respeta "reducir movimiento" del sistema.

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  /** Rectángulo o círculo */
  round: boolean;
}

const GRAVITY = 0.25;
const DRAG = 0.985;
const DURATION_MS = 3500;

/**
 * Lanza confeti desde los dos costados inferiores hacia el centro.
 * `amount`: piezas por costado.
 */
export function fireConfetti(colors: string[], amount = 90) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "3000",
  });
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const pieces: Piece[] = [];
  for (const side of [0, 1]) {
    for (let i = 0; i < amount; i++) {
      // Ángulo hacia arriba y hacia el centro de la pantalla
      const angle = (side ? -1 : 1) * (Math.PI / 6 + Math.random() * (Math.PI / 5));
      const speed = 11 + Math.random() * 9;
      pieces.push({
        x: side ? width : 0,
        y: height * 0.85,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed * 1.25,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        round: Math.random() < 0.3,
      });
    }
  }

  const start = performance.now();
  const frame = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    // Se desvanece en el último segundo
    ctx.globalAlpha = Math.max(0, Math.min(1, (DURATION_MS - elapsed) / 1000));
    for (const p of pieces) {
      p.vx *= DRAG;
      p.vy = p.vy * DRAG + GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // El coseno simula el giro en 3D del papel
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.abs(Math.cos(p.rotation * 2)) + 1);
      }
      ctx.restore();
    }
    if (elapsed < DURATION_MS) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(frame);
}
