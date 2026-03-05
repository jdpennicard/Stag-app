import { redirect } from 'next/navigation'
import { getCurrentUser, ensureAdminStatus } from '@/lib/auth'
import { getWeekendStarted } from '@/lib/weekend'
import AdminPanel from '@/components/AdminPanel'

const VALID_TABS = ['event-info', 'attendees', 'payments', 'bookings', 'email-templates']

export default async function AdminTabPage({
  params,
}: {
  params: { tab: string }
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
  const isAdminEmail = adminEmails.includes(user.email || '')
  
  if (!isAdminEmail) {
    redirect('/dashboard')
  }

  const profile = await ensureAdminStatus()
  if (!profile || !profile.is_admin) {
    redirect('/dashboard')
  }

  if (!VALID_TABS.includes(params.tab)) {
    redirect('/admin/event-info')
  }

  const weekendMode = await getWeekendStarted()
  return <AdminPanel weekendMode={weekendMode} />
}

