import { cookies } from 'next/headers'
import { createServerClient } from './supabase/server'

export const VIEW_AS_COOKIE = 'view_as_profile_id'

export async function getViewAsProfileId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(VIEW_AS_COOKIE)?.value ?? null
}

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
  const viewAsId = await getViewAsProfileId()

  // Admins can "view as" another user: use that profile for data/UI
  if (viewAsId) {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    if (adminEmails.includes(user.email || '')) {
      const { data: viewAsProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', viewAsId)
        .single()
      if (viewAsProfile && (viewAsProfile as any).user_id) {
        return viewAsProfile
      }
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id as any)
    .single()

  return profile
}

export async function isAdmin() {
  const profile = await getCurrentProfile()
  const profileData: any = profile as any
  return profileData?.is_admin ?? false
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
    .eq('user_id', user.id as any)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected if profile doesn't exist
    console.error('Error fetching profile in ensureAdminStatus:', fetchError)
  }

  const profileData: any = profile as any

  if (profileData && !profileData.is_admin) {
    const updateData: any = { is_admin: true }
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id as any)
    
    if (updateError) {
      console.error('Error updating admin status:', updateError)
      return null
    }
    // Return updated profile
    return { ...profileData, is_admin: true }
  } else if (!profileData) {
    const insertData: any = {
      user_id: user.id,
      full_name: user.email.split('@')[0],
      email: user.email,
      is_admin: true,
      total_due: 0,
      initial_confirmed_paid: 0,
    }
    const { data: insertedData, error: insertError } = await supabase
      .from('profiles')
      .insert(insertData)
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
  return profileData
}

