"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { AdaptiveDpr, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type SceneSettings = {
  color: string;
  metalness: number;
  roughness: number;
  wireframe: boolean;
  autoRotate: boolean;
  density: number;
};

/**
 * A field of instanced boxes whose heights follow a travelling sine wave,
 * displaced by the pointer.
 *
 * ── Why no model ────────────────────────────────────────────────────────────
 * The brief allows a compressed GLB, but the cheapest asset is the one you
 * never ship. Everything here is procedural, so the scene adds zero bytes of
 * geometry over the wire — only the renderer itself, which is lazy-loaded.
 *
 * ── Why instancing ──────────────────────────────────────────────────────────
 * At the default density this is 1,024 boxes. As separate meshes that is 1,024
 * draw calls a frame and a phone gets hot; as one InstancedMesh it is one.
 * Per-instance transforms are written into a single matrix buffer each frame.
 */
function Field({ settings }: { settings: SceneSettings }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pointer = useRef(new THREE.Vector2(0, 0));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const side = settings.density;
  const count = side * side;
  const spacing = 0.42;
  const offset = ((side - 1) * spacing) / 2;

  // Grid positions never change — only the heights do. Computing them once
  // takes two multiplications per instance out of every single frame.
  const grid = useMemo(() => {
    const xs = new Float32Array(count);
    const zs = new Float32Array(count);
    let i = 0;
    for (let x = 0; x < side; x++) {
      for (let z = 0; z < side; z++) {
        xs[i] = x * spacing - offset;
        zs[i] = z * spacing - offset;
        i++;
      }
    }
    return { xs, zs };
  }, [side, count, offset]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    const px0 = pointer.current.x * offset;
    const pz0 = pointer.current.y * offset;

    for (let i = 0; i < count; i++) {
      const dx = grid.xs[i] - px0;
      const dz = grid.zs[i] - pz0;
      // squared distance first: the sqrt is only needed for the wave phase,
      // and the cursor bump can use the square directly.
      const d2 = dx * dx + dz * dz;
      const dist = Math.sqrt(d2);

      const wave = Math.sin(dist * 1.6 - t * 2) * 0.35;
      const bump = Math.exp(-d2 * 0.35) * 0.9;
      const height = 0.12 + Math.max(0, wave + bump);

      dummy.position.set(grid.xs[i], height / 2, grid.zs[i]);
      dummy.scale.set(0.26, height, 0.26);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, count]}
      // Remounts cleanly when density changes — the buffer is fixed-size.
      key={count}
      castShadow
      receiveShadow
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (e.uv) pointer.current.set(e.uv.x * 2 - 1, e.uv.y * 2 - 1);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={settings.color}
        metalness={settings.metalness}
        roughness={settings.roughness}
        wireframe={settings.wireframe}
      />
    </instancedMesh>
  );
}

/** Invisible plane that keeps pointer tracking alive between the boxes. */
function PointerPlane({ onMove }: { onMove: (x: number, y: number) => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        onMove(e.point.x / 5, e.point.z / 5);
      }}
    >
      <planeGeometry args={[14, 14]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function WaveFieldCanvas({ settings }: { settings: SceneSettings }) {
  const pointerTarget = useRef(new THREE.Vector2());

  return (
    <Canvas
      shadows
      // Capping DPR is the single biggest phone-temperature lever: a 3x
      // device would otherwise render 9x the pixels for no visible gain here.
      dpr={[1, 1.5]}
      camera={{ position: [6, 5, 6], fov: 45 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0a0a0b"]} />
      <fog attach="fog" args={["#0a0a0b", 12, 22]} />

      {/* A local three-point rig instead of drei's <Environment preset>.
          The preset looks better, but it fetches a multi-megabyte HDR from a
          third-party CDN (raw.githack.com) at runtime — an external asset and
          an availability dependency, for a scene whose whole premise is that
          it downloads no assets at all. */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 3]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-6, 3, -4]} intensity={0.7} color="#6f8cff" />
      <pointLight position={[0, 4, 0]} intensity={12} distance={14} color="#9ec1ff" />

      <PointerPlane onMove={(x, y) => pointerTarget.current.set(x, y)} />
      <Field settings={settings} />

      <OrbitControls
        enablePan={false}
        autoRotate={settings.autoRotate}
        autoRotateSpeed={0.6}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={4}
        maxDistance={16}
        // Touch: one finger orbits, two pinch-zoom. Page scroll still works
        // because the canvas is a fixed-height block, not the whole page.
        makeDefault
      />
      {/* Drops resolution automatically if the frame rate sags. */}
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
