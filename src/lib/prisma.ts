import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// 런타임은 트랜잭션 풀러(DATABASE_URL) + node-postgres 드라이버 어댑터 사용
// DB_POOL_MAX: 로컬 테스트 DB(pglite)는 연결 1개만 허용 → 1. 운영은 미설정(기본값)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX) || undefined })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
