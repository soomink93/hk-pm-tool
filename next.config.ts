import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 수주 첨부(기안서 이미지·PDF) 업로드 — 기본 1MB로는 폰 사진이 막힘. 4MB 첨부 허용.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
