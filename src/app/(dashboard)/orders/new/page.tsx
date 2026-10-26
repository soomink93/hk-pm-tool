import { Card } from '@/components/ui/Card'
import { NewOrder } from '@/components/orders/NewOrder'
import { OrdersNav } from '@/components/orders/OrdersNav'
import { requireMe, teamDepts } from '@/lib/orders/session'
import { isSales } from '@/lib/orders/perm'
import { getOrderOpts } from '@/lib/orders/optionsServer'

export const dynamic = 'force-dynamic'

export default async function NewOrderPage() {
  const [me, depts, opts] = await Promise.all([requireMe(), teamDepts(), getOrderOpts()])
  const canCreate = isSales(me, depts)
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><OrdersNav active="new" canCreate={canCreate} /></div>
      {canCreate ? (
        <Card className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-base font-bold text-navy">수주 등록 (수주기안서 / 계약서)</h1>
          <NewOrder aiEnabled={!!process.env.ANTHROPIC_API_KEY} opts={opts} />
        </Card>
      ) : (
        <Card className="mx-auto max-w-md py-10 text-center text-[13px] text-slate-500">수주 등록은 영업 부문(국내영업)만 할 수 있습니다.</Card>
      )}
    </div>
  )
}
