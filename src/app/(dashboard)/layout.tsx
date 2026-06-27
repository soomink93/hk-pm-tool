import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Header } from '@/components/dashboard/Header'
import { TabNav } from '@/components/dashboard/TabNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { name, role, team } = session.user

  return (
    <div className="flex min-h-screen flex-col">
      <Header name={name ?? team ?? '사용자'} role={role} />
      <TabNav role={role} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">{children}</main>
    </div>
  )
}
