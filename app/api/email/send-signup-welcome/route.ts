import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/email/send'
import { EmailContext } from '@/lib/email/variables'

/**
 * POST /api/email/send-signup-welcome
 * Send welcome email after successful signup
 * Called from client after profile is linked
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, total_due, initial_confirmed_paid')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.email) {
      return NextResponse.json({ error: 'Profile has no email address' }, { status: 400 })
    }

    // Calculate confirmed total and remaining
    const { data: confirmedPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')

    const confirmedTotal = (confirmedPayments || []).reduce(
      (sum, p) => sum + Number(p.amount),
      Number(profile.initial_confirmed_paid || 0)
    )
    const remaining = Number(profile.total_due || 0) - confirmedTotal

    // Build email context
    const emailContext: EmailContext = {
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        total_due: Number(profile.total_due || 0),
        initial_confirmed_paid: Number(profile.initial_confirmed_paid || 0),
        confirmed_total: confirmedTotal,
        remaining: remaining,
      },
      event_name: process.env.NEXT_PUBLIC_STAG_EVENT_NAME,
      bank_account_name: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME,
      bank_account_number: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER,
      bank_sort_code: process.env.NEXT_PUBLIC_STAG_BANK_SORT_CODE,
      dashboard_url: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        : '/dashboard',
    }

    // Send welcome email (don't fail signup if email fails)
    const result = await sendTemplateEmail(
      'signup',
      profile.email,
      profile.full_name,
      emailContext,
      { logEmail: true }
    )

    if (!result.success) {
      console.error('Failed to send signup welcome email:', result.error)
      // Don't fail the request - signup was successful, email is optional
      return NextResponse.json({ 
        success: false, 
        warning: 'Signup successful but welcome email failed to send',
        error: result.error 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Welcome email sent successfully' 
    })
  } catch (error: any) {
    console.error('Error sending signup welcome email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

