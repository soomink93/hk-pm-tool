import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const hash = (pw: string) => bcrypt.hashSync(pw, 10);

async function main() {
  const users = [
    { email: "chairman@hk.test",    name: "회장님",    role: Role.chairman,  team: null,         pw: "chairman123" },
    { email: "sales.exec@hk.test",  name: "영업임원",  role: Role.executive, team: "영업부문",   pw: "exec123" },
    { email: "mkt.exec@hk.test",    name: "마케팅임원", role: Role.executive, team: "마케팅부문", pw: "exec123" },
    { email: "minjun.kim@hk.test",  name: "김민준",    role: Role.teamlead,  team: "영업팀",     pw: "lead123" },
    { email: "seoyeon.lee@hk.test", name: "이서연",    role: Role.teamlead,  team: "마케팅팀",   pw: "lead123" },
    { email: "jiho.park@hk.test",   name: "박지호",    role: Role.teamlead,  team: "인사팀",     pw: "lead123" },
    { email: "sua.choi@hk.test",    name: "최수아",    role: Role.teamlead,  team: "재무팀",     pw: "lead123" },
    { email: "taeyang.jung@hk.test", name: "정태양",   role: Role.teamlead,  team: "운영팀",     pw: "lead123" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, role: u.role, team: u.team, passwordHash: hash(u.pw) },
    });
  }

  const teams = [
    { name: "영업팀",   lead: "김민준" },
    { name: "마케팅팀", lead: "이서연" },
    { name: "인사팀",   lead: "박지호" },
    { name: "재무팀",   lead: "최수아" },
    { name: "운영팀",   lead: "정태양" },
  ];
  for (const t of teams) {
    await prisma.team.upsert({ where: { name: t.name }, update: {}, create: t });
  }

  if ((await prisma.decision.count()) === 0) {
    await prisma.decision.createMany({
      data: [
        { date: "2026-05-30", content: "하반기 채용 계획 확정",        tier: "2단계", decider: "인사 임원",   priority: "high", status: "완료" },
        { date: "2026-05-28", content: "신규 마케팅 채널 예산 배정",   tier: "2단계", decider: "마케팅 임원", priority: "mid",  status: "완료" },
        { date: "2026-05-26", content: "Q2 영업 목표 하향 조정",       tier: "3단계", decider: "회장님",      priority: "high", status: "완료" },
        { date: "2026-06-02", content: "파트너사 계약 갱신 조건 결정", tier: "2단계", decider: "영업 임원",   priority: "mid",  status: "진행중" },
      ],
    });
  }

  if ((await prisma.escalation.count()) === 0) {
    await prisma.escalation.createMany({
      data: [
        { item: "하반기 예산 재편성",      tier: "3단계", dept: "재무팀", needed: "전체 하반기 예산 15% 재배분 승인", deadline: "2026-06-20", status: "대기중" },
        { item: "신규 사업 파트너십 체결", tier: "3단계", dept: "영업팀", needed: "전략적 파트너십 계약 최종 승인",   deadline: "2026-06-25", status: "대기중" },
        { item: "조직 구조 개편안",        tier: "3단계", dept: "인사팀", needed: "팀 신설 및 인원 재배치 승인",      deadline: "2026-07-01", status: "검토중" },
      ],
    });
  }

  console.log("Seed complete: users 8, teams 5, kpis 5, decisions 4, escalations 3");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
