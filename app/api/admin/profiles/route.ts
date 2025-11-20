import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createServerClient()

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ 
        error: 'Failed to fetch profiles', 
        details: profilesError.message 
      }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json([])
    }

    // Fetch all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'confirmed' as any)

    if (paymentsError) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Calculate totals for each profile
    const profilesWithTotals = profiles.map((profile) => {
      // Get payments linked by user_id OR profile_id (for unlinked profiles)
      const confirmedFromPayments =
        payments
          ?.filter((p) => 
            (p.user_id && p.user_id === profile.user_id) || 
            (p.profile_id && p.profile_id === profile.id)
          )
          .reduce((sum, p) => sum + Number(p.amount), 0) || 0

      const confirmedTotal = Number(profile.initial_confirmed_paid) + confirmedFromPayments
      const remaining = Number(profile.total_due) - confirmedTotal

      return {
        ...profile,
        confirmed_total: confirmedTotal,
        remaining,
      }
    })

    return NextResponse.json(profilesWithTotals)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

