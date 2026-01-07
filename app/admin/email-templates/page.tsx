import { redirect } from 'next/navigation'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import EmailTemplatesContent from '@/components/EmailTemplatesContent'

export default async function EmailTemplatesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const admin = await isAdmin()
  if (!admin) {
    redirect('/dashboard')
  }

  return <EmailTemplatesContent />
}

