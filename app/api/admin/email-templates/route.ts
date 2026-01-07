import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * GET /api/admin/email-templates
 * Get all email templates (admin only)
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
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching email templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email templates', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(templates || [])
  } catch (error: any) {
    console.error('Error in GET /api/admin/email-templates:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/email-templates
 * Create a new email template (admin only)
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
    const { name, subject, body_text, body_html, description, event_type, enabled } = body

    if (!name || !subject || !body_text || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, body_text, event_type' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        name,
        subject,
        body_text,
        body_html: body_html || null,
        description: description || null,
        event_type,
        enabled: enabled !== undefined ? enabled : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating email template:', error)
      return NextResponse.json(
        { error: 'Failed to create email template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error in POST /api/admin/email-templates:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

