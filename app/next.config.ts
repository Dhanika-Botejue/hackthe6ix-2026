import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @smartspectra/node-sdk loads koffi (native FFI, not ESM-bundleable) at
  // runtime — keep it a real require() instead of letting the bundler try
  // to inline it.
  serverExternalPackages: ["@smartspectra/node-sdk", "koffi"],
};

export default nextConfig;
