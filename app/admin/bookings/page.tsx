import { redirect } from 'next/navigation'
import { getCurrentUser, ensureAdminStatus } from '@/lib/auth'
import BookingsContent from '@/components/BookingsContent'

export default async function BookingsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  // Check if user's email is in ADMIN_EMAILS
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
  const isAdminEmail = adminEmails.includes(user.email || '')
  
  if (!isAdminEmail) {
    redirect('/dashboard')
  }

  // Ensure admin status is set
  const profile = await ensureAdminStatus()
  
  if (!profile || !profile.is_admin) {
    redirect('/dashboard')
  }

  return <BookingsContent />
}

