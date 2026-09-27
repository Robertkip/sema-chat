/**
 * The static poster shown instead of the canvas.
 *
 * Used in three situations, all of them real:
 *   1. `prefers-reduced-motion` — a continuously animating field is exactly
 *      what that setting exists to prevent.
 *   2. No WebGL — some locked-down browsers and older devices.
 *   3. Before the viewer is opened, so the renderer is never downloaded by
 *      someone who only scrolled past.
 *
 * It is inline SVG, so it costs no request and renders identically offline.
 */
export function SceneFallback({ reason }: { reason: "reduced-motion" | "no-webgl" | "idle" }) {
  const message = {
    "reduced-motion":
      "Your system asks for reduced motion, so the animated scene is off. The static composition below is the same geometry at rest.",
    "no-webgl": "This browser cannot render WebGL, so here is a static view instead.",
    idle: "The 3D renderer is about 600 KB, so it only downloads when you ask for it.",
  }[reason];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0a0a0b] p-6">
      <svg viewBox="0 0 320 180" className="w-full max-w-md" role="img" aria-label="A field of bars forming a wave">
        <defs>
          <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7aa2ff" />
            <stop offset="100%" stopColor="#2a3a6b" />
          </linearGradient>
        </defs>
        {Array.from({ length: 48 }, (_, i) => {
          const x = 8 + i * 6.4;
          const h = 14 + Math.abs(Math.sin(i * 0.38)) * 62 + Math.exp(-((i - 24) ** 2) / 90) * 46;
          return <rect key={i} x={x} y={150 - h} width="4" height={h} rx="1.5" fill="url(#bar)" opacity={0.55 + (h / 260)} />;
        })}
        <line x1="0" y1="150" x2="320" y2="150" stroke="#262a30" strokeWidth="1" />
      </svg>
      <p className="max-w-sm text-center text-xs text-[#9aa0ad]">{message}</p>
    </div>
  );
}
