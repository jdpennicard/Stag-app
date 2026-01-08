import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/email/send'
import { EmailContext } from '@/lib/email/variables'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const supabase = createServerClient()

    // Get the payment and user info before updating (for email)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, user_id, amount, note, created_at, deadline_id, status')
      .eq('id', params.id as any)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const updateData: any = {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
    }

    const { error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', params.id as any)

    if (error) {
      return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 })
    }

    // Send payment approved email (if template exists and user has email)
    try {
      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, total_due, initial_confirmed_paid')
        .eq('user_id', payment.user_id)
        .single()

      if (profile && profile.email) {
        // Get deadline label if applicable
        let deadlineLabel: string | undefined
        if (payment.deadline_id) {
          const { data: deadline } = await supabase
            .from('payment_deadlines')
            .select('label')
            .eq('id', payment.deadline_id)
            .single()
          deadlineLabel = deadline?.label
        }

        // Calculate confirmed total and remaining (now including this payment)
        const { data: confirmedPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('user_id', payment.user_id)
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
          payment: {
            id: payment.id,
            amount: Number(payment.amount),
            status: 'confirmed', // Now confirmed
            note: payment.note || undefined,
            created_at: payment.created_at,
            deadline_label: deadlineLabel,
          },
          event_name: (await supabase.from('stag_dates').select('event_name').order('created_at', { ascending: false }).limit(1).single()).data?.event_name || process.env.NEXT_PUBLIC_STAG_EVENT_NAME,
          bank_account_name: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME,
          bank_account_number: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER,
          bank_sort_code: process.env.NEXT_PUBLIC_STAG_BANK_SORT_CODE,
          dashboard_url: process.env.NEXT_PUBLIC_APP_URL 
            ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            : '/dashboard',
        }

        // Send email (don't fail confirmation if email fails)
        await sendTemplateEmail(
          'payment_approved',
          profile.email,
          profile.full_name,
          emailContext,
          { logEmail: true }
        ).catch((err) => {
          console.error('Failed to send payment approved email:', err)
          // Don't throw - payment confirmation was successful, email is optional
        })
      }
    } catch (emailError) {
      console.error('Error sending payment approved email:', emailError)
      // Don't fail the confirmation if email fails
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

