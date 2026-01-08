import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * GET /api/admin/deadlines
 * Get all payment deadlines (admin only)
 */
export async function GET() {
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

    const supabase = createServerClient()
    const { data: deadlines, error } = await supabase
      .from('payment_deadlines')
      .select('*')
      .order('due_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch deadlines', details: error.message }, { status: 500 })
    }

    return NextResponse.json(deadlines || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/deadlines
 * Create a new payment deadline (admin only)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { label, due_date } = body

    if (!label || !due_date) {
      return NextResponse.json({ error: 'Label and due_date are required' }, { status: 400 })
    }

    const supabase = createServerClient()
    
    // Check if a deadline already exists - if so, update it instead of creating a new one
    const { data: existing } = await supabase
      .from('payment_deadlines')
      .select('id')
      .limit(1)
      .single()

    let result
    if (existing) {
      // Update existing deadline
      const { data, error } = await supabase
        .from('payment_deadlines')
        .update({ label, due_date, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to update deadline', details: error.message }, { status: 500 })
      }
      result = data
    } else {
      // Create new deadline
      const { data, error } = await supabase
        .from('payment_deadlines')
        .insert({ label, due_date })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to create deadline', details: error.message }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

