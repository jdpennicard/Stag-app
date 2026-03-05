import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import ClaimProfileForm from '@/components/ClaimProfileForm'

export default async function ClaimProfilePage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const profile = await getCurrentProfile()
  if (profile) {
    redirect('/dashboard')
  }

  // Try one more time to auto-link by email (in case it wasn't caught earlier)
  if (user.email) {
    const supabase = createServerClient()
    const { data: matchingProfile } = await supabase
      .from('profiles')
      .select('id, user_id, is_stag_only')
      .eq('email', user.email as any)
      .is('user_id', null)
      .single()
    
    if (matchingProfile) {
      const matchData: any = matchingProfile
      const { error: linkError } = await supabase
        .from('profiles')
        .update({ user_id: user.id })
        .eq('id', matchingProfile.id as any)
        .is('user_id', null)
      
      if (!linkError) {
        redirect(matchData.is_stag_only ? '/games' : '/dashboard')
      }
      
      if (linkError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        const { error: adminError } = await supabaseAdmin
          .from('profiles')
          .update({ user_id: user.id })
          .eq('id', matchingProfile.id as any)
          .is('user_id', null)
        
        if (!adminError) {
          redirect(matchData.is_stag_only ? '/games' : '/dashboard')
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Select Your Name</h1>
        <ClaimProfileForm />
      </div>
    </div>
  )
}

