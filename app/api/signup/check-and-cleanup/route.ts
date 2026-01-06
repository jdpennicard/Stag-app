import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Check if an auth user exists for an email, and if it's orphaned (no linked profile),
 * delete it so we can create a fresh account.
 * This ensures unclaimed profiles have no auth users.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, profileId } = await request.json()

    if (!email || !profileId) {
      return NextResponse.json(
        { error: 'Email and profileId are required' },
        { status: 400 }
      )
    }

    // Verify the profile exists and is unclaimed
    const supabase = createServerClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, user_id, signup_token')
      .eq('id', profileId as any)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const profileData: any = profile as any

    // Verify profile is unclaimed
    if (profileData.user_id) {
      return NextResponse.json(
        { error: 'Profile is already claimed' },
        { status: 400 }
      )
    }

    // Verify email matches
    if (profileData.email !== email) {
      return NextResponse.json(
        { error: 'Email does not match profile' },
        { status: 400 }
      )
    }

    // Use service role key to check/delete auth users
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if an auth user exists for this email
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      // If we can't list users, continue anyway (might not have service role key)
      return NextResponse.json({ 
        cleaned: false,
        message: 'Could not check for existing auth users (service role key may be missing)'
      })
    }

    // Find auth user with matching email
    const existingAuthUser = authUsers?.users.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingAuthUser) {
      // Auth user exists but profile is unclaimed - this is an orphaned account
      // Delete it so we can create a fresh account
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        existingAuthUser.id
      )

      if (deleteError) {
        console.error('Error deleting orphaned auth user:', deleteError)
        return NextResponse.json(
          { 
            error: 'Failed to clean up orphaned auth user',
            details: deleteError.message 
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        cleaned: true,
        message: 'Orphaned auth user removed. You can now create a new account.'
      })
    }

    // No auth user exists - perfect, ready for signup
    return NextResponse.json({
      cleaned: false,
      message: 'No existing auth user found. Ready for signup.'
    })
  } catch (error: any) {
    console.error('Error in check-and-cleanup:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

