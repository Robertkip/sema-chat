"use client";

import { useEffect, useRef, useState } from "react";
import { AURORA_FRAGMENT, AURORA_VERTEX } from "./aurora.frag";

/**
 * Fullscreen shader hero, on raw WebGL.
 *
 * No three.js: this scene is one triangle and one fragment shader, so an
 * engine would add ~265 KB gzipped to render something the platform draws in
 * about 60 lines. The whole component compiles to roughly 2 KB.
 *
 * Responsible-shipping rules, all enforced below:
 *   - device pixel ratio capped at 1.5
 *   - the loop stops when the tab is hidden, and when the hero scrolls away
 *   - prefers-reduced-motion never starts WebGL at all; it gets a CSS gradient
 *     built from the same palette
 */

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ShaderHero({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [staticOnly, setStaticOnly] = useState(true);

  useEffect(() => {
    setStaticOnly(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (staticOnly) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) {
      setStaticOnly(true);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, AURORA_VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, AURORA_FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      setStaticOnly(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      setStaticOnly(true);
      return;
    }
    gl.useProgram(program);

    // One triangle large enough to cover clip space.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    // Capped DPR: a 3x phone would otherwise shade nine times the pixels for
    // a soft gradient nobody can see the extra detail in.
    const DPR_CAP = 1.5;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const w = Math.floor(wrap.clientWidth * dpr);
      const h = Math.floor(wrap.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();

    const mouse = { x: 0.5, y: 0.5 };
    const onPointer = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
    };
    wrap.addEventListener("pointermove", onPointer, { passive: true });

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // Two independent reasons to stop drawing, both of them real: the tab is
    // in the background, or the hero has scrolled off screen.
    let visible = true;
    let onScreen = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen && visible) start();
      },
      { threshold: 0 },
    );
    io.observe(wrap);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible && onScreen) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let raf = 0;
    let running = false;
    const t0 = performance.now();

    const frame = () => {
      if (!visible || !onScreen) {
        running = false;
        return;
      }
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };

    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [staticOnly]);

  return (
    <div
      ref={wrapRef}
      className="relative isolate overflow-hidden rounded-panel"
      // The static frame doubles as the paint-before-WebGL-starts background,
      // so there is never a flash of empty canvas.
      style={{
        background:
          "radial-gradient(120% 90% at 50% 10%, #12306f 0%, #0b1a3d 45%, #05060b 100%)",
      }}
    >
      {!staticOnly && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 size-full"
        />
      )}
      {/* Scrim, weighted toward the bottom where the copy sits.
          The shader must not be trusted to stay dark: its brightest possible
          pixel would leave white text at 2.17:1. This guarantees the floor
          regardless of what the shader does, and leaves the top of the frame
          clear so the aurora is still the thing you look at. Contrast is part
          of the design, not something measured afterwards. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/55 to-black/10"
      />
      {children}
    </div>
  );
}
