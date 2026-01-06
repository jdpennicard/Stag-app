import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

/**
 * Send password reset email for a user
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user's email is in ADMIN_EMAILS
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    const isAdminEmail = adminEmails.includes(user.email || '')
    
    if (!isAdminEmail) {
      // Also check via profile
      const admin = await isAdmin()
      if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const { email, profileId } = await request.json()

    if (!email && !profileId) {
      return NextResponse.json({ error: 'Either email or profile ID is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    let targetEmail: string | null = null

    // If profileId is provided, get the email from the profile
    if (profileId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, user_id')
        .eq('id', profileId as any)
        .single()

      if (profileError || !profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }

      const profileData: any = profile as any
      
      if (!profileData.email) {
        return NextResponse.json({ error: 'Profile does not have an email address' }, { status: 400 })
      }

      if (!profileData.user_id) {
        return NextResponse.json({ error: 'Profile is not linked to a user account yet' }, { status: 400 })
      }

      targetEmail = profileData.email
    } else {
      targetEmail = email
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    // Use service role key to send password reset (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Send password reset email
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
    })

    if (resetError) {
      console.error('Failed to send password reset:', resetError)
      
      // Check if user exists
      if (resetError.message?.includes('not found') || resetError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'No account found with this email address' 
        }, { status: 404 })
      }

      return NextResponse.json({ 
        error: 'Failed to send password reset email',
        details: resetError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${targetEmail}`,
      email: targetEmail
    })
  } catch (error: any) {
    console.error('Error sending password reset:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

