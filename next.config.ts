import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour autoriser les requêtes du smartphone sur le réseau local
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "192.168.1.8:3000", "192.168.1.8"],
    },
  },
};

export default nextConfig;