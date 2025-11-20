import { createServerClient } from './supabase/server'

export async function getCurrentUser() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return profile
}

export async function isAdmin() {
  const profile = await getCurrentProfile()
  return profile?.is_admin ?? false
}

export async function ensureAdminStatus() {
  const user = await getCurrentUser()
  if (!user?.email) return null

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
  if (!adminEmails.includes(user.email)) return null

  const supabase = createServerClient()
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected if profile doesn't exist
    console.error('Error fetching profile in ensureAdminStatus:', fetchError)
  }

  if (profile && !profile.is_admin) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('user_id', user.id)
    
    if (updateError) {
      console.error('Error updating admin status:', updateError)
      return null
    }
    // Return updated profile
    return { ...profile, is_admin: true }
  } else if (!profile) {
    const { data: insertedData, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        full_name: user.email.split('@')[0],
        email: user.email,
        is_admin: true,
        total_due: 0,
        initial_confirmed_paid: 0,
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error inserting admin profile:', insertError)
      return null
    }
    
    // Return the inserted profile data
    return insertedData
  }

  // Profile exists and is already admin
  return profile
}

