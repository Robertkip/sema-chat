import { PageShell } from "@/components/page-shell";
import { SceneClient } from "./scene-client";

export const metadata = { title: "3D scene" };

export default function ScenePage() {
  return (
    <PageShell
      title="Wave field"
      lede="An interactive 3D scene built from procedural geometry — no model is downloaded. Move the pointer to displace the wave, or reconfigure the material on the right."
    >
      <SceneClient />
    </PageShell>
  );
}
