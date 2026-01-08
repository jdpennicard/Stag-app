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
      // Check for auto-link by email - use service role for reliable linking
      const supabase = (await import('@/lib/supabase/server')).createServerClient()
      
      // First try with regular client
      let { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email as any)
        .is('user_id', null)
        .single()
      
      // If not found, try with service role key (bypasses RLS)
      if (!existingProfile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        const { data: adminProfile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('email', user.email as any)
          .is('user_id', null)
          .single()
        existingProfile = adminProfile
      }
      
      if (existingProfile) {
        const profileData: any = existingProfile as any
        const updateData: any = { user_id: user.id }
        
        // Try update with regular client first
        let updateError = null
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profileData.id as any)
          .is('user_id', null)
        
        updateError = error
        
        // If update failed, try with service role key
        if (updateError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          )
          const { error: adminError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', profileData.id as any)
            .is('user_id', null)
          
          if (!adminError) {
            // Successfully linked, redirect
            redirect('/dashboard')
          }
        } else if (!updateError) {
          // Successfully linked, redirect
          redirect('/dashboard')
        }
      }
      
      // If we get here, no profile found or linking failed - go to claim page
      redirect('/claim-profile')
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

