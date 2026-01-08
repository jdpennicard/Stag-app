import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * GET /api/admin/reminder-schedules
 * List all deadline reminder schedules (admin only)
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('deadline_reminder_schedules')
      .select(`
        *,
        email_templates (
          id,
          name,
          subject,
          event_type
        )
      `)
      .order('days_before', { ascending: false })

    if (error) {
      console.error('Error fetching reminder schedules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reminder schedules', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error in reminder-schedules GET:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/reminder-schedules
 * Create a new reminder schedule (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { days_before, template_id, enabled, description } = body

    if (!days_before || days_before < 0) {
      return NextResponse.json(
        { error: 'days_before must be a non-negative integer' },
        { status: 400 }
      )
    }

    if (!template_id) {
      return NextResponse.json(
        { error: 'template_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify template exists and is a deadline_reminder template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('id, event_type, enabled')
      .eq('id', template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      )
    }

    if (template.event_type !== 'deadline_reminder') {
      return NextResponse.json(
        { error: 'Template must be of type "deadline_reminder"' },
        { status: 400 }
      )
    }

    if (!template.enabled) {
      return NextResponse.json(
        { error: 'Email template is disabled. Please enable it first.' },
        { status: 400 }
      )
    }

    // Check if schedule with this days_before already exists
    const { data: existing } = await supabase
      .from('deadline_reminder_schedules')
      .select('id')
      .eq('days_before', days_before)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `A reminder schedule for ${days_before} days before already exists` },
        { status: 400 }
      )
    }

    // Create the schedule
    const { data: schedule, error: insertError } = await supabase
      .from('deadline_reminder_schedules')
      .insert({
        days_before,
        template_id,
        enabled: enabled !== undefined ? enabled : true,
        description: description || null,
      })
      .select(`
        *,
        email_templates (
          id,
          name,
          subject,
          event_type
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating reminder schedule:', insertError)
      return NextResponse.json(
        { error: 'Failed to create reminder schedule', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(schedule, { status: 201 })
  } catch (error: any) {
    console.error('Error in reminder-schedules POST:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

