import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/email/send'
import { EmailContext } from '@/lib/email/variables'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, paymentDate, note } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Combine payment date with note if both are provided
    let finalNote = note || ''
    if (paymentDate) {
      const dateStr = new Date(paymentDate).toLocaleDateString('en-GB')
      finalNote = finalNote ? `${finalNote} (Date: ${dateStr})` : `Payment Date: ${dateStr}`
    }

    const insertData: any = {
      user_id: user.id,
      amount,
      deadline_id: null,
      note: finalNote || null,
      status: 'pending',
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    // Send payment submitted email (if template exists and user has email)
    try {
      // Get user's profile to build email context
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, total_due, initial_confirmed_paid')
        .eq('user_id', user.id)
        .single()

      if (profile && profile.email) {
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
          payment: {
            id: payment.id,
            amount: Number(payment.amount),
            status: payment.status,
            note: payment.note || undefined,
            created_at: payment.created_at,
          },
          event_name: process.env.NEXT_PUBLIC_STAG_EVENT_NAME,
          bank_account_name: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NAME,
          bank_account_number: process.env.NEXT_PUBLIC_STAG_BANK_ACCOUNT_NUMBER,
          bank_sort_code: process.env.NEXT_PUBLIC_STAG_BANK_SORT_CODE,
          dashboard_url: process.env.NEXT_PUBLIC_APP_URL 
            ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            : '/dashboard',
        }

        // Send email (don't fail payment if email fails)
        await sendTemplateEmail(
          'payment_submitted',
          profile.email,
          profile.full_name,
          emailContext,
          { logEmail: true }
        ).catch((err) => {
          console.error('Failed to send payment submitted email:', err)
          // Don't throw - payment was successful, email is optional
        })
      }
    } catch (emailError) {
      console.error('Error sending payment submitted email:', emailError)
      // Don't fail the payment if email fails
    }

    return NextResponse.json(payment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

