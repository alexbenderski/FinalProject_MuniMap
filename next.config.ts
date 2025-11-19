import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "./", // קובע ל־Next.js שהשורש הוא התיקייה הנוכחית
  },
};
module.exports = {
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
};
export default nextConfig;