import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // 마이그레이션은 세션 풀러(DIRECT_URL)로 직접 연결 (pgBouncer 트랜잭션 모드 회피)
  datasource: {
    url: env("DIRECT_URL"),
  },
});
