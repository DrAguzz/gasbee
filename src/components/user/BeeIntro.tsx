import { useEffect, useMemo } from "react";
import gasbeeMark from "@/assets/gasbee-mark.png";

interface Props {
  onDone: () => void;
}

export function BeeIntro({ onDone }: Props) {
  const id = useMemo(() => "bee-" + Math.random().toString(36).slice(2, 8), []);

  const { keyframes, duration } = useMemo(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const startSize = 80;
    // Header logo lives in UserLayout: px-4 (16) py-3 (12), Logo size=32
    const endX = 16;
    const endY = 12;
    const endScale = 32 / startSize;

    const pts: { x: number; y: number; s: number; r: number }[] = [];
    // Start: fly in from bottom-right off-screen
    pts.push({ x: w + 40, y: h - 120, s: 1, r: -20 });
    // Random midpoints
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      pts.push({
        x: Math.random() * (w - startSize),
        y: Math.random() * (h - startSize - 80) + 40,
        s: 0.85 + Math.random() * 0.4,
        r: Math.random() * 60 - 30,
      });
    }
    // End: top-left, scaled to header logo size
    pts.push({ x: endX, y: endY, s: endScale, r: 0 });

    const last = pts.length - 1;
    const kf = pts
      .map((p, i) => {
        const pct = ((i / last) * 100).toFixed(2);
        return `${pct}% { transform: translate(${p.x}px, ${p.y}px) scale(${p.s}) rotate(${p.r}deg); }`;
      })
      .join("\n");

    return { keyframes: kf, duration: 3.4 };
  }, []);

  useEffect(() => {
    const t = setTimeout(onDone, duration * 1000 + 150);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      <style>{`
        @keyframes ${id}-fly { ${keyframes} }
        @keyframes ${id}-flap {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          50% { transform: scaleY(0.15) scaleX(0.9); }
        }
        @keyframes ${id}-fade {
          0%, 85% { opacity: 1; }
          100% { opacity: 0; }
        }
        .${id}-bee {
          position: absolute;
          top: 0; left: 0;
          width: 80px; height: 80px;
          animation:
            ${id}-fly ${duration}s cubic-bezier(.45,.05,.55,.95) forwards,
            ${id}-fade ${duration}s ease-out forwards;
          will-change: transform, opacity;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.25));
        }
        .${id}-wing {
          position: absolute;
          width: 26px; height: 16px;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          top: 10px;
          animation: ${id}-flap 0.1s linear infinite;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        .${id}-wing.l { left: 8px; transform-origin: right center; }
        .${id}-wing.r { right: 8px; transform-origin: left center; }
        .${id}-img { position: relative; width: 100%; height: 100%; object-fit: contain; }
      `}</style>
      <div className={`${id}-bee`}>
        <span className={`${id}-wing l`} />
        <span className={`${id}-wing r`} />
        <img src={gasbeeMark} alt="" className={`${id}-img`} />
      </div>
    </div>
  );
}
