import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile, ensureAdminStatus } from '@/lib/auth'
import AuthForm from '@/components/AuthForm'

export default async function Home() {
  const user = await getCurrentUser()
  
  if (user) {
    const adminProfile = await ensureAdminStatus()
    const profile = adminProfile || await getCurrentProfile()
    
    // If admin, redirect to admin panel
    if (profile?.is_admin) {
      redirect('/admin')
    }
    
    if (profile) {
      redirect('/dashboard')
    } else {
      // Check for auto-link by email
      const supabase = (await import('@/lib/supabase/server')).createServerClient()
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .is('user_id', null)
        .single()
      
      if (existingProfile) {
        await supabase
          .from('profiles')
          .update({ user_id: user.id })
          .eq('id', existingProfile.id)
        redirect('/dashboard')
      } else {
        redirect('/claim-profile')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          {process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "Owen's Stag 2026 - Bournemouth"}
        </h1>
        <p className="text-center text-gray-600 mb-8">Payments Tracker</p>
        <AuthForm />
      </div>
    </div>
  )
}

