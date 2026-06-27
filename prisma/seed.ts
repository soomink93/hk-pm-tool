import "dotenv/config";
import { PrismaClient, Role, TeamStatus } from "@prisma/client";
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
    { name: "영업팀",   lead: "김민준", status: TeamStatus.green,  submitted: true,  risk: "없음", escalation: "없음" },
    { name: "마케팅팀", lead: "이서연", status: TeamStatus.yellow, submitted: true,  risk: "Q2 캠페인 일정 지연 위험", escalation: "없음" },
    { name: "인사팀",   lead: "박지호", status: TeamStatus.gray,   submitted: false, risk: "—", escalation: "—" },
    { name: "재무팀",   lead: "최수아", status: TeamStatus.red,    submitted: true,  risk: "Q2 예산 초과 가능성", escalation: "하반기 예산 재편성 승인 필요" },
    { name: "운영팀",   lead: "정태양", status: TeamStatus.green,  submitted: true,  risk: "없음", escalation: "없음" },
  ];
  for (const t of teams) {
    await prisma.team.upsert({ where: { name: t.name }, update: {}, create: t });
  }

  if ((await prisma.kpi.count()) === 0) {
    await prisma.kpi.createMany({
      data: [
        { team: "영업팀",   metric: "월 매출 목표",  target: 100, current: 92,  unit: "%" },
        { team: "마케팅팀", metric: "리드 획득 수",  target: 200, current: 134, unit: "건" },
        { team: "인사팀",   metric: "채용 목표",     target: 10,  current: 7,   unit: "명" },
        { team: "재무팀",   metric: "비용 절감률",   target: 15,  current: 8,   unit: "%" },
        { team: "운영팀",   metric: "프로세스 개선", target: 5,   current: 5,   unit: "건" },
      ],
    });
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
