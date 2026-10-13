import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditCalendar } from '@/lib/rbac'
import { CalendarView } from '@/components/dashboard/CalendarView'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const session = await auth()
  const { role, email, name } = session!.user
  const canEdit = canEditCalendar(role, email, name)

  const events = await prisma.calendarEvent.findMany({ orderBy: { date: 'asc' } })

  return (
    <CalendarView
      events={events.map((e) => ({ id: e.id, date: e.date, title: e.title, memo: e.memo, createdByName: e.createdByName }))}
      canEdit={canEdit}
    />
  )
}
