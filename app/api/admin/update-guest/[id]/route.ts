import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { full_name, email, total_due, initial_confirmed_paid, is_admin } = await request.json()

    const supabase = createServerClient()

    const updateData: any = {
      full_name,
      email: email || null,
      total_due: parseFloat(total_due),
      initial_confirmed_paid: parseFloat(initial_confirmed_paid) || 0,
      is_admin: is_admin || false,
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', params.id as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

