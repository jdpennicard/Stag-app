import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * GET /api/admin/stag-dates
 * Get stag dates (admin only for editing, but anyone can view)
 */
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: dates, error } = await supabase
      .from('stag_dates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch stag dates', details: error.message }, { status: 500 })
    }

    // If no dates exist, return default
    if (!dates) {
      return NextResponse.json({
        id: null,
        start_date: '2026-03-06',
        end_date: '2026-03-08',
      })
    }

    return NextResponse.json(dates)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/stag-dates
 * Update stag dates (admin only)
 */
export async function PATCH(request: NextRequest) {
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
    const { start_date, end_date } = body

    if (!start_date) {
      return NextResponse.json({ error: 'start_date is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    
    // Check if a record exists
    const { data: existing } = await supabase
      .from('stag_dates')
      .select('id')
      .limit(1)
      .single()

    let result
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('stag_dates')
        .update({
          start_date,
          end_date: end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating stag dates:', error)
        return NextResponse.json({ 
          error: 'Failed to update stag dates', 
          details: error.message,
          code: error.code,
          hint: error.code === '42P01' ? 'The stag_dates table does not exist. Please run the migration: migrations/add-stag-dates.sql' : undefined
        }, { status: 500 })
      }
      result = data
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('stag_dates')
        .insert({
          start_date,
          end_date: end_date || null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating stag dates:', error)
        return NextResponse.json({ 
          error: 'Failed to create stag dates', 
          details: error.message,
          code: error.code,
          hint: error.code === '42P01' ? 'The stag_dates table does not exist. Please run the migration: migrations/add-stag-dates.sql' : undefined
        }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

