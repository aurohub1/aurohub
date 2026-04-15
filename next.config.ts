import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dxgj4bcch/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      { protocol: "https", hostname: "**.panrotas.com.br" },
      { protocol: "https", hostname: "panrotas.com.br" },
      { protocol: "https", hostname: "**.newsapi.org" },
      { protocol: "https", hostname: "newsapi.org" },
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "canvas"];
    } else {
      config.resolve = config.resolve || {};
      config.resolve.fallback = { ...config.resolve.fallback, canvas: false };
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      canvas: { browser: "" },
    },
  },
};

export default nextConfig;
