import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { user_id, profile_id, amount, paymentDate, note } = await request.json()

    if ((!user_id && !profile_id) || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Either User ID or Profile ID, and valid amount are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Verify the profile exists
    let profile: any = null
    if (user_id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single()
      if (error || !data) {
        return NextResponse.json({ error: 'Guest profile not found' }, { status: 404 })
      }
      profile = data
    } else if (profile_id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile_id)
        .single()
      if (error || !data) {
        return NextResponse.json({ error: 'Guest profile not found' }, { status: 404 })
      }
      profile = data
    }

    if (!profile) {
      return NextResponse.json({ error: 'Guest profile not found' }, { status: 404 })
    }

    // Combine payment date with note if both are provided
    let finalNote = note || ''
    if (paymentDate) {
      const dateStr = new Date(paymentDate).toLocaleDateString('en-GB')
      finalNote = finalNote ? `${finalNote} (Date: ${dateStr})` : `Payment Date: ${dateStr}`
    }

    const insertData: any = {
      amount: parseFloat(amount),
      deadline_id: null,
      note: finalNote || null,
      status: 'pending',
    }

    // Add user_id if available, otherwise use profile_id
    if (user_id) {
      insertData.user_id = user_id
    } else {
      insertData.profile_id = profile_id || profile?.id
    }

    const { data, error } = await supabase
      .from('payments')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Payment insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to create payment', 
        details: error.message,
        code: error.code,
        hint: error.hint || 'Make sure you have run the add-profile-id-to-payments.sql migration script in Supabase'
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

