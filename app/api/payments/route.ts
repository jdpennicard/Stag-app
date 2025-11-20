import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

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

    const { data, error } = await supabase
      .from('payments')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

