import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // These ship barrel files; without this, importing one symbol pulls the
    // whole module graph into the client bundle.
    optimizePackageImports: ["ai", "@ai-sdk/react", "@react-three/drei"],
  },
};

export default nextConfig;
