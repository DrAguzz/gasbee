import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeSliderProps {
  onConfirm: () => void;
  label: string;
  amount: number;
}

export function SwipeSlider({ onConfirm, label, amount }: SwipeSliderProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  useEffect(() => {
    const updateMaxDrag = () => {
      if (containerRef.current) {
        const handleWidth = 48; // Width of the thumb button
        setMaxDrag(Math.max(0, containerRef.current.clientWidth - handleWidth - 8)); // padding 4px * 2
      }
    };
    
    updateMaxDrag();
    window.addEventListener("resize", updateMaxDrag);
    return () => window.removeEventListener("resize", updateMaxDrag);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isConfirmed) return;
    setIsDragging(true);
    startXRef.current = e.clientX - dragX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isConfirmed) return;
    const currentX = e.clientX;
    const calculatedDrag = currentX - startXRef.current;
    const newDrag = Math.max(0, Math.min(calculatedDrag, maxDrag));
    setDragX(newDrag);
  };

  const handlePointerUp = () => {
    if (!isDragging || isConfirmed) return;
    setIsDragging(false);
    
    if (dragX >= maxDrag * 0.9) {
      setDragX(maxDrag);
      setIsConfirmed(true);
      onConfirm();
    } else {
      setDragX(0);
    }
  };

  const percent = maxDrag > 0 ? (dragX / maxDrag) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-14 w-full items-center rounded-full bg-slate-100 dark:bg-slate-900 p-1 select-none overflow-hidden transition-all duration-300 border border-slate-200 dark:border-slate-800",
        isConfirmed && "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
      )}
    >
      {/* Background slide text */}
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400 select-none pointer-events-none transition-opacity">
        {isConfirmed ? (
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
            ✅ Tunai RM{amount.toFixed(2)} Diterima
          </span>
        ) : (
          <span style={{ opacity: Math.max(0.2, 1 - (percent / 70)) }}>
            {label} (RM {amount.toFixed(2)})
          </span>
        )}
      </div>

      {/* Swipe Fill track */}
      <div
        className="absolute left-1 top-1 bottom-1 bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 opacity-20 rounded-full select-none pointer-events-none"
        style={{ width: `${dragX + 24}px`, transition: isDragging ? "none" : "width 0.3s ease" }}
      />

      {/* Sliding Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "absolute left-1 flex h-12 w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-full shadow-md select-none touch-none",
          isConfirmed 
            ? "bg-emerald-500 text-white" 
            : "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
        )}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
        }}
      >
        {isConfirmed ? (
          <Check className="h-5 w-5" />
        ) : (
          <ArrowRight className="h-5 w-5" />
        )}
      </div>
    </div>
  );
}
