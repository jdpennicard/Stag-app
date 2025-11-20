import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

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

    const { full_name, email, total_due, initial_confirmed_paid, is_admin } = await request.json()

    if (!full_name || total_due === undefined) {
      return NextResponse.json({ error: 'Full name and total due are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        full_name,
        email: email || null,
        total_due: parseFloat(total_due),
        initial_confirmed_paid: parseFloat(initial_confirmed_paid) || 0,
        is_admin: is_admin || false,
      } as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to add guest' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

