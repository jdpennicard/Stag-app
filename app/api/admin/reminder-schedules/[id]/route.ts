import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * PATCH /api/admin/reminder-schedules/[id]
 * Update a reminder schedule (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const supabase = createServerClient()

    // Get existing schedule
    const { data: existing, error: fetchError } = await supabase
      .from('deadline_reminder_schedules')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Reminder schedule not found' },
        { status: 404 }
      )
    }

    // If days_before is being changed, check for conflicts
    if (days_before !== undefined && days_before !== existing.days_before) {
      if (days_before < 0) {
        return NextResponse.json(
          { error: 'days_before must be a non-negative integer' },
          { status: 400 }
        )
      }

      const { data: conflict } = await supabase
        .from('deadline_reminder_schedules')
        .select('id')
        .eq('days_before', days_before)
        .neq('id', params.id)
        .single()

      if (conflict) {
        return NextResponse.json(
          { error: `A reminder schedule for ${days_before} days before already exists` },
          { status: 400 }
        )
      }
    }

    // If template_id is being changed, verify it
    if (template_id !== undefined && template_id !== existing.template_id) {
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
    }

    // Build update object
    const updates: any = {}
    if (days_before !== undefined) updates.days_before = days_before
    if (template_id !== undefined) updates.template_id = template_id
    if (enabled !== undefined) updates.enabled = enabled
    if (description !== undefined) updates.description = description || null

    // Update the schedule
    const { data: updated, error: updateError } = await supabase
      .from('deadline_reminder_schedules')
      .update(updates)
      .eq('id', params.id)
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

    if (updateError) {
      console.error('Error updating reminder schedule:', updateError)
      return NextResponse.json(
        { error: 'Failed to update reminder schedule', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error in reminder-schedules PATCH:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/reminder-schedules/[id]
 * Delete a reminder schedule (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { error } = await supabase
      .from('deadline_reminder_schedules')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting reminder schedule:', error)
      return NextResponse.json(
        { error: 'Failed to delete reminder schedule', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in reminder-schedules DELETE:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

