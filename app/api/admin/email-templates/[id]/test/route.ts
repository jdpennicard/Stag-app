import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/email/send'
import { EmailContext } from '@/lib/email/variables'

/**
 * POST /api/admin/email-templates/[id]/test
 * Send a test email using a template (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || []
    const isAdminEmail = adminEmails.includes(user.email || '')
    
    if (!isAdminEmail) {
      const admin = await isAdmin()
      if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const { testEmail } = await request.json()

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      )
    }

    // Get the template
    const supabase = createServerClient()
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', params.id as any)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create sample context data for testing
    const context: EmailContext = {
      profile: {
        id: 'test-profile-id',
        full_name: 'John Doe',
        email: testEmail,
        total_due: 500.00,
        initial_confirmed_paid: 100.00,
        confirmed_total: 200.00,
        remaining: 300.00,
      },
      payment: {
        id: 'test-payment-id',
        amount: 100.00,
        status: 'pending',
        note: 'Test payment note',
        created_at: new Date().toISOString(),
        deadline_label: 'Deposit',
      },
      deadline: {
        id: 'test-deadline-id',
        label: 'Final Payment',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        suggested_amount: 200.00,
        days_away: 7,
      },
      event_name: (await supabase.from('stag_dates').select('event_name').order('created_at', { ascending: false }).limit(1).single()).data?.event_name || process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "Owen's Stag 2026 - Bournemouth",
      bank_account_name: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME || 'Test Bank Account',
      bank_account_number: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER || '12345678',
      bank_sort_code: process.env.NEXT_PUBLIC_STAG_BANK_SORT_CODE || '12-34-56',
      dashboard_url: process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app/dashboard',
    }

    // Debug: Check if RESEND_API_KEY is available
    const hasResendKey = !!process.env.RESEND_API_KEY
    console.log('Resend API Key check:', {
      hasKey: hasResendKey,
      keyLength: process.env.RESEND_API_KEY?.length || 0,
      keyPrefix: process.env.RESEND_API_KEY?.substring(0, 5) || 'none'
    })

    // Send the test email using the template name
    const result = await sendTemplateEmail(
      template.name, // Use template name to find it
      testEmail,
      'John Doe', // recipient name
      context,
      { logEmail: true }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      messageId: result.messageId,
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/email-templates/[id]/test:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

