import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { sendTemplateEmail } from '@/lib/email/send'
import { EmailContext } from '@/lib/email/variables'

/**
 * Generate a signup link and send it via email to the guest
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
      .select('id, full_name, email, user_id, total_due, initial_confirmed_paid')
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
        error: 'Profile is already claimed. Cannot send signup link for linked profiles.' 
      }, { status: 400 })
    }

    // Check if profile has an email
    if (!profileData.email) {
      return NextResponse.json({ 
        error: 'Profile has no email address. Cannot send signup link.' 
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

    // Calculate confirmed total and remaining for email context
    // For unclaimed profiles, payments might be linked by profile_id
    const { data: confirmedPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('profile_id', profileId as any)
      .eq('status', 'confirmed')

    // If there's an error querying payments, log it but continue (might be RLS issue)
    if (paymentsError) {
      console.warn('Could not fetch payments for email context:', paymentsError)
    }

    const confirmedTotal = (confirmedPayments || []).reduce(
      (sum, p) => sum + Number(p.amount),
      Number(profileData.initial_confirmed_paid || 0)
    )
    const remaining = Number(profileData.total_due || 0) - confirmedTotal

    // Build email context
    const emailContext: EmailContext = {
      profile: {
        id: profileData.id,
        full_name: profileData.full_name,
        email: profileData.email,
        total_due: Number(profileData.total_due || 0),
        initial_confirmed_paid: Number(profileData.initial_confirmed_paid || 0),
        confirmed_total: confirmedTotal,
        remaining: remaining,
      },
      event_name: (await supabase.from('stag_dates').select('event_name').order('created_at', { ascending: false }).limit(1).single()).data?.event_name || process.env.NEXT_PUBLIC_STAG_EVENT_NAME,
      bank_account_name: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME,
      bank_account_number: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER,
      bank_sort_code: process.env.NEXT_PUBLIC_STAG_BANK_SORT_CODE,
      dashboard_url: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        : '/dashboard',
      signup_link: signupUrl,
    }

    // Send email using the signup_link template
    const emailResult = await sendTemplateEmail(
      'signup_link',
      profileData.email,
      profileData.full_name,
      emailContext,
      { logEmail: true }
    )

    if (!emailResult.success) {
      console.error('Failed to send signup link email:', emailResult.error)
      // Don't fail the entire request - the link was generated successfully
      // Just return a warning that email failed
      return NextResponse.json({ 
        success: true,
        warning: 'Signup link generated but email failed to send',
        error: emailResult.error || 'Email template not found or email service error',
        signupUrl, // Return the URL so they can copy it manually
        profileId,
        token,
        expiresAt: expiresAt.toISOString(),
        profileName: profileData.full_name,
        emailSent: false,
      }, { status: 200 }) // Return 200 with warning instead of 500
    }

    return NextResponse.json({
      success: true,
      message: `Signup link sent to ${profileData.email}`,
      signupUrl,
      profileId,
      token,
      expiresAt: expiresAt.toISOString(),
      profileName: profileData.full_name,
      emailSent: true,
    })
  } catch (error: any) {
    console.error('Error sending signup link:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

