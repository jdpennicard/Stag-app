import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * GET /api/admin/email-templates/[id]
 * Get a single email template (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', params.id as any)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      console.error('Error fetching email template:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error in GET /api/admin/email-templates/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/email-templates/[id]
 * Update an email template (admin only)
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
    const { name, subject, body_text, body_html, description, event_type, enabled, reminder_days } = body

    // Get current template to check event_type
    const supabase = createServerClient()
    const { data: currentTemplate } = await supabase
      .from('email_templates')
      .select('event_type')
      .eq('id', params.id)
      .single()

    const finalEventType = event_type !== undefined ? event_type : currentTemplate?.event_type

    // Validate reminder_days if event_type is deadline_reminder
    if (finalEventType === 'deadline_reminder' && reminder_days !== undefined) {
      if (!Array.isArray(reminder_days) || reminder_days.length === 0) {
        return NextResponse.json(
          { error: 'reminder_days must be a non-empty array for deadline_reminder templates' },
          { status: 400 }
        )
      }
      if (!reminder_days.every((d: any) => Number.isInteger(d) && d >= 0)) {
        return NextResponse.json(
          { error: 'reminder_days must be an array of non-negative integers' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (subject !== undefined) updateData.subject = subject
    if (body_text !== undefined) updateData.body_text = body_text
    if (body_html !== undefined) updateData.body_html = body_html
    if (description !== undefined) updateData.description = description
    if (event_type !== undefined) updateData.event_type = event_type
    if (enabled !== undefined) updateData.enabled = enabled
    if (reminder_days !== undefined) {
      updateData.reminder_days = finalEventType === 'deadline_reminder' ? reminder_days : null
    }

    const { data: template, error } = await supabase
      .from('email_templates')
      .update(updateData)
      .eq('id', params.id as any)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      console.error('Error updating email template:', error)
      return NextResponse.json(
        { error: 'Failed to update email template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/email-templates/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/email-templates/[id]
 * Delete an email template (admin only)
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
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', params.id as any)

    if (error) {
      console.error('Error deleting email template:', error)
      return NextResponse.json(
        { error: 'Failed to delete email template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/email-templates/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

