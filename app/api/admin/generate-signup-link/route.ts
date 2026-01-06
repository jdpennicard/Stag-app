import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { randomBytes } from 'crypto'

/**
 * Generate a unique signup link for an unclaimed profile
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

    const { profileId } = await request.json()

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Check if profile exists and is unclaimed
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_id')
      .eq('id', profileId as any)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Cast to any to avoid TypeScript issues
    const profileData: any = profile as any

    // Check if profile is already claimed
    if (profileData.user_id) {
      return NextResponse.json({ 
        error: 'Profile is already claimed. Cannot generate signup link for linked profiles.' 
      }, { status: 400 })
    }

    // Generate a secure random token (32 bytes = 64 hex characters)
    const token = randomBytes(32).toString('hex')
    
    // Set expiration to 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Update profile with token and expiration
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        signup_token: token,
        signup_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', profileId as any)

    if (updateError) {
      console.error('Failed to update profile with signup token:', updateError)
      
      // Check if columns don't exist (migration not run)
      if (updateError.message?.includes('column') && updateError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database migration not run. Please run migrations/add-signup-token.sql in Supabase SQL Editor.',
          details: updateError.message
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to generate signup link',
        details: updateError.message || 'Unknown database error'
      }, { status: 500 })
    }

    // Generate the signup URL
    // Try to get the base URL from various sources
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    
    if (!baseUrl) {
      // Try to get from request headers (works in production)
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      if (host) {
        baseUrl = `${protocol}://${host}`
      } else {
        // Fallback for local development
        baseUrl = 'http://localhost:3000'
      }
    }
    
    const signupUrl = `${baseUrl}/signup/${profileId}/${token}`

    return NextResponse.json({
      success: true,
      signupUrl,
      profileId,
      token,
      expiresAt: expiresAt.toISOString(),
      profileName: profileData.full_name,
    })
  } catch (error: any) {
    console.error('Error generating signup link:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

