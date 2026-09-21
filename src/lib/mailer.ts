import nodemailer from 'nodemailer'

export function mailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

// mailplug SMTP 등 (환경변수로 설정). 미설정 시 mailConfigured()로 사전 차단.
function transport() {
  const port = Number(process.env.SMTP_PORT ?? 465)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465=SSL, 587=STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendMail(opts: { to: string[]; subject: string; html: string }) {
  if (!mailConfigured()) throw new Error('SMTP 미설정: SMTP_HOST/SMTP_USER/SMTP_PASS 환경변수를 설정하세요.')
  if (opts.to.length === 0) throw new Error('수신자가 없습니다.')
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER!
  const info = await transport().sendMail({
    from: `HK 운영 대시보드 <${from}>`,
    to: opts.to.join(', '),
    subject: opts.subject,
    html: opts.html,
  })
  return { messageId: info.messageId, accepted: info.accepted }
}
