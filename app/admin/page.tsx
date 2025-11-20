import { redirect } from 'next/navigation'
import { getCurrentUser, ensureAdminStatus } from '@/lib/auth'
import AdminContent from '@/components/AdminContent'

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  // Check if user's email is in ADMIN_EMAILS
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
  const isAdminEmail = adminEmails.includes(user.email || '')
  
  if (!isAdminEmail) {
    // Not an admin email, redirect
    redirect('/dashboard')
  }

  // Ensure admin status is set - this returns the profile directly
  const profile = await ensureAdminStatus()
  
  if (!profile || !profile.is_admin) {
    console.error('Failed to set admin status or profile not admin. User:', user.email)
    redirect('/dashboard')
  }

  return <AdminContent />
}

