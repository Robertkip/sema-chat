"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SceneFallback } from "./scene-fallback";
import type { SceneSettings } from "./wave-field";

/**
 * `ssr: false` plus a dynamic import keeps three.js, fiber and drei out of
 * every other route's bundle — and out of this one until the viewer is
 * actually started. The scene page itself stays a few kilobytes.
 */
const WaveFieldCanvas = dynamic(
  () => import("./wave-field").then((m) => m.WaveFieldCanvas),
  { ssr: false, loading: () => <SceneFallback reason="idle" /> },
);

const DEFAULTS: SceneSettings = {
  color: "#7aa2ff",
  metalness: 0.55,
  roughness: 0.25,
  wireframe: false,
  autoRotate: true,
  density: 32,
};

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

export function SceneClient() {
  const [settings, setSettings] = useState<SceneSettings>(DEFAULTS);
  const [started, setStarted] = useState(false);
  const [blocked, setBlocked] = useState<"reduced-motion" | "no-webgl" | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBlocked("reduced-motion");
    } else if (!webglAvailable()) {
      setBlocked("no-webgl");
    }
  }, []);

  const set = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="relative h-[420px] overflow-hidden rounded-panel border border-line sm:h-[520px]">
        {blocked ? (
          <SceneFallback reason={blocked} />
        ) : started ? (
          <WaveFieldCanvas settings={settings} />
        ) : (
          <>
            <SceneFallback reason="idle" />
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="absolute inset-x-0 bottom-6 mx-auto w-fit rounded-control bg-brand px-5 py-2.5 text-sm font-medium text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Start the 3D scene
            </button>
          </>
        )}
      </div>

      <form
        className="flex flex-col gap-4 rounded-panel border border-line p-4"
        aria-label="Scene configurator"
        onSubmit={(e) => e.preventDefault()}
      >
        <p className="text-sm font-medium">Configurator</p>

        <Field label="Colour">
          <input
            type="color"
            value={settings.color}
            onChange={(e) => set("color", e.target.value)}
            className="h-9 w-full cursor-pointer rounded-control border border-line bg-surface-raised"
          />
        </Field>

        <Slider
          label="Metalness"
          value={settings.metalness}
          onChange={(v) => set("metalness", v)}
        />
        <Slider
          label="Roughness"
          value={settings.roughness}
          onChange={(v) => set("roughness", v)}
        />
        <Slider
          label="Density"
          value={settings.density}
          min={8}
          max={48}
          step={4}
          format={(v) => `${v}×${v} (${v * v} boxes)`}
          onChange={(v) => set("density", v)}
        />

        <Toggle
          label="Wireframe"
          checked={settings.wireframe}
          onChange={(v) => set("wireframe", v)}
        />
        <Toggle
          label="Auto-rotate"
          checked={settings.autoRotate}
          onChange={(v) => set("autoRotate", v)}
        />

        <button
          type="button"
          onClick={() => setSettings(DEFAULTS)}
          className="mt-1 rounded-control border border-line px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Reset
        </button>

        <p className="mt-1 text-xs text-ink-muted">
          Move the pointer over the field to displace the wave. Drag to orbit,
          pinch or scroll to zoom.
        </p>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="flex justify-between text-ink-muted">
        <span>{label}</span>
        <span className="font-mono">{format ? format(value) : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand)]"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-ink-muted">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4"
      />
    </label>
  );
}
