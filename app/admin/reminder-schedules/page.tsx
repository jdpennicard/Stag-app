import { redirect } from 'next/navigation'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import ReminderSchedulesContent from '@/components/ReminderSchedulesContent'

export default async function ReminderSchedulesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const admin = await isAdmin()
  if (!admin) {
    redirect('/dashboard')
  }

  return <ReminderSchedulesContent />
}

