import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.30.1.34"],

  // 기존 설정이 있으면 아래에 그대로 유지
};

export default nextConfig;