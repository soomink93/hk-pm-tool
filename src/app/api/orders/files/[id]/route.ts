import { auth } from '@/lib/auth'
import { canSeeOrders } from '@/lib/orders/perm'
import { prisma } from '@/lib/prisma'

// 브라우저에서 바로 열어도 안전한 형식만 inline, 나머지(html/svg 등)는 다운로드 강제 — 업로드 파일 통한 XSS 방지
const INLINE = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'text/plain'])

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('인증이 필요합니다.', { status: 401 })
  if (!canSeeOrders(session.user.role)) return new Response('Not found', { status: 404 }) // 공개 전에는 관리자만
  const f = await prisma.orderFile.findUnique({ where: { id: (await params).id } })
  if (!f) return new Response('Not found', { status: 404 })
  const inline = INLINE.has(f.mime)
  return new Response(Buffer.from(f.data), {
    headers: {
      'Content-Type': inline ? f.mime : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      'X-Content-Type-Options': 'nosniff',
      // sandbox CSP는 Chrome PDF 뷰어를 막으므로 다운로드 강제 파일에만
      ...(!inline && { 'Content-Security-Policy': "sandbox; default-src 'none'" }),
      'Cache-Control': 'private, no-store',
    },
  })
}
