import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "./", // קובע ל־Next.js שהשורש הוא התיקייה הנוכחית
  },
};

export default nextConfig;