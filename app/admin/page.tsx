import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getOperator } from "@/lib/server/admin"
import { getAdminStatsAction, listGiftsAction } from "./actions"
import { AdminClient } from "./AdminClient"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { robots: { index: false, follow: false } }

// Operator console. Anyone who isn't the masteradmin gets a plain 404 — not a
// "forbidden" page, which would confirm the route exists and is worth attacking.
export default async function AdminPage() {
  const operator = await getOperator()
  if (!operator) notFound()

  const [stats, gifts] = await Promise.all([getAdminStatsAction(), listGiftsAction()])

  return <AdminClient email={operator.email} stats={stats} gifts={gifts} />
}
