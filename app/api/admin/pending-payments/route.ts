import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export async function GET() {
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

    // Fetch pending payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending' as any)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json([])
    }

    // Cast payments to any[] to avoid TypeScript errors
    const paymentsArray: any[] = payments as any[]

    // Fetch related profiles and deadlines
    const userIds = Array.from(new Set(paymentsArray.map((p) => p.user_id).filter(Boolean)))
    const profileIds = Array.from(new Set(paymentsArray.map((p) => p.profile_id).filter(Boolean)))
    const deadlineIds = Array.from(new Set(paymentsArray.map((p) => p.deadline_id).filter(Boolean)))

    // Fetch profiles by user_id
    let profilesByUserId: any[] = []
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds)
      profilesByUserId = data || []
    }

    // Fetch profiles by profile_id (for unlinked profiles)
    let profilesById: any[] = []
    if (profileIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds)
      profilesById = data || []
    }

    let deadlines: any[] = []
    if (deadlineIds.length > 0) {
      const { data } = await supabase
        .from('payment_deadlines')
        .select('id, label')
        .in('id', deadlineIds)
      deadlines = data || []
    }

    // Transform the data
    const formattedPayments = paymentsArray.map((payment: any) => {
      // Try to find profile by user_id first, then by profile_id
      const profile = payment.user_id 
        ? profilesByUserId?.find((p) => p.user_id === payment.user_id)
        : profilesById?.find((p) => p.id === payment.profile_id)
      const deadline = deadlines?.find((d) => d.id === payment.deadline_id)

      return {
        id: payment.id,
        amount: payment.amount,
        note: payment.note,
        created_at: payment.created_at,
        full_name: profile?.full_name || 'Unknown',
        email: profile?.email || null,
        deadline_label: deadline?.label || null,
      }
    })

    return NextResponse.json(formattedPayments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

