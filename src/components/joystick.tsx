"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type JoystickProps = {
  /** Called continuously while joystick is displaced. x/y in [-1, 1]. */
  onChange: (x: number, y: number) => void;
  /** Called when joystick is released (returns to center). */
  onRelease: () => void;
  /** Diameter in pixels. */
  size?: number;
  /** Whether the joystick is interactive. */
  disabled?: boolean;
};

export function Joystick({
  onChange,
  onRelease,
  size = 150,
  disabled = false,
}: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const radius = size / 2;
  const knobRadius = size * 0.18;
  const travelRadius = radius - knobRadius;
  const deadzone = 0.08;

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = (clientX - centerX) / travelRadius;
      let dy = (clientY - centerY) / travelRadius;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        dx /= dist;
        dy /= dist;
      }

      const nx = Math.abs(dx) < deadzone ? 0 : dx;
      const ny = Math.abs(dy) < deadzone ? 0 : dy;

      setPos({ x: nx, y: ny });
      onChange(nx, ny);
    },
    [onChange, travelRadius, deadzone]
  );

  const handleRelease = useCallback(() => {
    setDragging(false);
    setPos({ x: 0, y: 0 });
    onRelease();
  }, [onRelease]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setDragging(true);
      updatePosition(e.clientX, e.clientY);
    },
    [disabled, updatePosition]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updatePosition(e.clientX, e.clientY);
    };
    const handleMouseUp = () => handleRelease();
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, updatePosition, handleRelease]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      setDragging(true);
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    },
    [disabled, updatePosition]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      e.preventDefault();
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    },
    [dragging, updatePosition]
  );

  const handleTouchEnd = useCallback(() => handleRelease(), [handleRelease]);

  const knobCx = radius + pos.x * travelRadius;
  const knobCy = radius + pos.y * travelRadius;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative select-none ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer track */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - 2}
          fill="#f1f5f9"
          stroke="#e2e8f0"
          strokeWidth={1.5}
        />
        {/* Subtle crosshairs */}
        <line x1={radius} y1={knobRadius + 4} x2={radius} y2={size - knobRadius - 4} stroke="#e2e8f0" strokeWidth={1} />
        <line x1={knobRadius + 4} y1={radius} x2={size - knobRadius - 4} y2={radius} stroke="#e2e8f0" strokeWidth={1} />
        {/* Knob shadow */}
        <circle
          cx={knobCx + 1}
          cy={knobCy + 2}
          r={knobRadius}
          fill="rgba(0,0,0,0.08)"
        />
        {/* Knob */}
        <circle
          cx={knobCx}
          cy={knobCy}
          r={knobRadius}
          fill={dragging ? "#2563eb" : "#3b82f6"}
          stroke={dragging ? "#1d4ed8" : "#2563eb"}
          strokeWidth={1.5}
        />
        {/* Knob highlight */}
        <circle
          cx={knobCx - knobRadius * 0.25}
          cy={knobCy - knobRadius * 0.25}
          r={knobRadius * 0.35}
          fill="rgba(255,255,255,0.25)"
        />
      </svg>
    </div>
  );
}
