import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * Server-side API route to link a profile to the current user after signup
 * This ensures the linking works even if client-side updates fail due to RLS
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { profileId, token } = await request.json()
    if (!profileId || !token) {
      return NextResponse.json({ error: 'Profile ID and token required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // First check if profile is already linked to this user
    const { data: alreadyLinked } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId as any)
      .eq('user_id', user.id as any)
      .single()

    if (alreadyLinked) {
      // Already linked - return success
      return NextResponse.json({ 
        success: true, 
        message: 'Profile already linked',
        profileId: alreadyLinked.id
      })
    }

    // Verify the profile exists, token matches, and is unclaimed
    // Try with token first, but also allow linking by email if token is missing/used
    let { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, signup_token, signup_token_expires_at, user_id')
      .eq('id', profileId as any)
      .eq('signup_token', token)
      .is('user_id', null)
      .single()

    // If not found with token, try without token requirement (for retry scenarios)
    if (fetchError || !profile) {
      const { data: profileByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('id, email, signup_token, signup_token_expires_at, user_id')
        .eq('id', profileId as any)
        .eq('email', user.email as any)
        .is('user_id', null)
        .single()
      
      if (profileByEmail) {
        profile = profileByEmail
        fetchError = null
      }
    }

    if (fetchError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found, token invalid, or already claimed',
        details: fetchError?.message 
      }, { status: 404 })
    }

    const profileData: any = profile as any

    // Check if token is expired
    if (profileData.signup_token_expires_at) {
      const expiresAt = new Date(profileData.signup_token_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Signup token has expired' }, { status: 400 })
      }
    }

    // Link the profile to the user
    // Build update query - use token if it matches, otherwise just use email match
    let updateQuery = supabase
      .from('profiles')
      .update({
        user_id: user.id,
        email: user.email || profileData.email || null,
        signup_token: null,
        signup_token_expires_at: null,
      })
      .eq('id', profileId as any)
      .is('user_id', null) // Only update if still unclaimed
    
    // If token matches, use it as additional filter; otherwise just match by email
    if (profileData.signup_token === token) {
      updateQuery = updateQuery.eq('signup_token', token)
    } else if (user.email && profileData.email === user.email) {
      // Token doesn't match but email does - allow linking anyway
      updateQuery = updateQuery.eq('email', user.email as any)
    } else {
      // Neither token nor email match - this shouldn't happen, but fail gracefully
      return NextResponse.json({ 
        error: 'Cannot verify profile ownership',
        details: 'Token and email do not match'
      }, { status: 400 })
    }
    
    const { error: updateError } = await updateQuery

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
      .select('id, user_id')
      .eq('id', profileId as any)
      .eq('user_id', user.id as any)
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
      profileId: linkedProfile.id
    })
  } catch (error: any) {
    console.error('Error in link-profile route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

