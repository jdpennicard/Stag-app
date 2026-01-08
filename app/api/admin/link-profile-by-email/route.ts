import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

/**
 * Admin-only endpoint to manually link a profile to a user by email
 * This is useful for fixing cases where signup didn't properly link the profile
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    const isAdminEmail = adminEmails.includes(user.email || '')
    
    if (!isAdminEmail) {
      const admin = await isAdmin()
      if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const { profileId, userEmail } = await request.json()

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_id')
      .eq('id', profileId as any)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profileData: any = profile as any

    // Check if profile is already linked
    if (profileData.user_id) {
      return NextResponse.json({ 
        error: 'Profile is already linked to a user',
        details: `Profile is linked to user ID: ${profileData.user_id}`
      }, { status: 400 })
    }

    // Find the auth user by email using service role key (bypasses RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Service role key not configured. Cannot look up auth users.' 
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // Find auth user by email
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listing auth users:', authError)
      return NextResponse.json({ 
        error: 'Failed to look up auth users',
        details: authError.message 
      }, { status: 500 })
    }

    const targetUser = authUsers.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase())

    if (!targetUser) {
      return NextResponse.json({ 
        error: 'No auth user found with that email',
        details: `No user found with email: ${userEmail}`
      }, { status: 404 })
    }

    // Check if this user already has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('user_id', targetUser.id as any)
      .single()

    if (existingProfile) {
      return NextResponse.json({ 
        error: 'User already has a linked profile',
        details: `User is already linked to profile: ${existingProfile.full_name} (${existingProfile.id})`
      }, { status: 400 })
    }

    // Link the profile to the user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        user_id: targetUser.id,
        email: userEmail, // Ensure email matches
        signup_token: null, // Clear any signup tokens
        signup_token_expires_at: null,
      })
      .eq('id', profileId as any)
      .is('user_id', null) // Only update if still unclaimed

    if (updateError) {
      console.error('Failed to link profile:', updateError)
      return NextResponse.json({ 
        error: 'Failed to link profile', 
        details: updateError.message 
      }, { status: 500 })
    }

    // Verify the update worked
    const { data: linkedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, user_id, email')
      .eq('id', profileId as any)
      .eq('user_id', targetUser.id as any)
      .single()

    if (verifyError || !linkedProfile) {
      console.error('Failed to verify profile link:', verifyError)
      return NextResponse.json({ 
        error: 'Profile linked but verification failed',
        details: verifyError?.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile linked successfully',
      profile: {
        id: linkedProfile.id,
        full_name: linkedProfile.full_name,
        email: linkedProfile.email,
        user_id: linkedProfile.user_id
      }
    })
  } catch (error: any) {
    console.error('Error in link-profile-by-email route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

