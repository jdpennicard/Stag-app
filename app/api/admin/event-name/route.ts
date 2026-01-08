import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * GET /api/admin/event-name
 * Get event name (anyone can view)
 */
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: stagDates } = await supabase
      .from('stag_dates')
      .select('event_name')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const eventName = stagDates?.event_name || process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "YOUR EVENT NAME"
    
    return NextResponse.json({ event_name: eventName })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/event-name
 * Update event name (admin only)
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
    const { event_name } = body

    if (!event_name || event_name.trim() === '') {
      return NextResponse.json({ error: 'event_name is required' }, { status: 400 })
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
        .update({ event_name: event_name.trim() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating event name:', error)
        return NextResponse.json({ 
          error: 'Failed to update event name', 
          details: error.message,
          code: error.code
        }, { status: 500 })
      }
      result = data
    } else {
      // Create new record with default dates
      const { data, error } = await supabase
        .from('stag_dates')
        .insert({
          start_date: '2026-03-06',
          end_date: '2026-03-08',
          event_name: event_name.trim(),
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating stag dates with event name:', error)
        return NextResponse.json({ 
          error: 'Failed to create event name', 
          details: error.message,
          code: error.code
        }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

