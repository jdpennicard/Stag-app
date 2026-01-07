/**
 * Email Sending Utilities
 * 
 * High-level functions for sending emails using templates
 */

import { createServerClient } from '@/lib/supabase/server'
import { sendEmail, SendEmailOptions } from './client'
import { substituteVariables, EmailContext } from './variables'
import { createClient } from '@supabase/supabase-js'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_text: string
  body_html?: string
  event_type: string
  enabled: boolean
}

/**
 * Get a template from the database by name or event_type
 */
export async function getEmailTemplate(
  templateNameOrEventType: string
): Promise<EmailTemplate | null> {
  const supabase = createServerClient()
  
  // Try to find by name first, then by event_type
  const { data: templateByName, error: errorByName } = await supabase
    .from('email_templates')
    .select('*')
    .eq('name', templateNameOrEventType)
    .eq('enabled', true)
    .single()

  if (!errorByName && templateByName) {
    return templateByName as EmailTemplate
  }

  const { data: templateByEvent, error: errorByEvent } = await supabase
    .from('email_templates')
    .select('*')
    .eq('event_type', templateNameOrEventType)
    .eq('enabled', true)
    .single()

  if (!errorByEvent && templateByEvent) {
    return templateByEvent as EmailTemplate
  }

  return null
}

/**
 * Send an email using a template from the database
 */
export async function sendTemplateEmail(
  templateNameOrEventType: string,
  recipientEmail: string,
  recipientName: string,
  context: EmailContext,
  options?: { from?: string; logEmail?: boolean }
): Promise<{ success: boolean; messageId?: string; error?: string; templateId?: string }> {
  const template = await getEmailTemplate(templateNameOrEventType)
  
  if (!template) {
    return { 
      success: false, 
      error: `Email template "${templateNameOrEventType}" not found or disabled` 
    }
  }

  // Substitute variables in subject and body
  const subject = substituteVariables(template.subject, context)
  const bodyText = substituteVariables(template.body_text, context)
  const bodyHtml = template.body_html && template.body_html.trim()
    ? substituteVariables(template.body_html, context)
    : undefined

  // Send the email
  const result = await sendEmail({
    to: recipientEmail,
    subject,
    bodyText,
    bodyHtml,
    from: options?.from,
  })

  // Log the email if requested (default: true)
  if (options?.logEmail !== false && result.success) {
    await logEmail({
      templateId: template.id,
      templateName: template.name,
      recipientEmail,
      recipientName,
      subject,
      bodyText,
      bodyHtml,
      variablesUsed: extractVariablesUsed(context),
      status: 'sent',
      messageId: result.messageId,
    })
  } else if (options?.logEmail !== false && !result.success) {
    await logEmail({
      templateId: template.id,
      templateName: template.name,
      recipientEmail,
      recipientName,
      subject,
      bodyText,
      bodyHtml,
      variablesUsed: extractVariablesUsed(context),
      status: 'failed',
      errorMessage: result.error,
    })
  }

  return {
    ...result,
    templateId: template.id,
  }
}

/**
 * Log an email to the database
 */
async function logEmail(data: {
  templateId: string
  templateName: string
  recipientEmail: string
  recipientName: string
  subject: string
  bodyText: string
  bodyHtml?: string
  variablesUsed: Record<string, any>
  status: 'pending' | 'sent' | 'failed'
  messageId?: string
  errorMessage?: string
}): Promise<void> {
  try {
    // Use service role key to bypass RLS for logging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Cannot log email - Supabase credentials missing')
      return
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    await supabaseAdmin.from('email_log').insert({
      template_id: data.templateId,
      template_name: data.templateName,
      recipient_email: data.recipientEmail,
      recipient_name: data.recipientName,
      subject: data.subject,
      body_text: data.bodyText,
      body_html: data.bodyHtml,
      variables_used: data.variablesUsed,
      status: data.status,
      error_message: data.errorMessage,
      sent_at: data.status === 'sent' ? new Date().toISOString() : null,
    })
  } catch (err) {
    console.error('Error logging email:', err)
    // Don't throw - email logging failure shouldn't break email sending
  }
}

/**
 * Extract variables used from context for logging
 */
function extractVariablesUsed(context: EmailContext): Record<string, any> {
  return {
    profile: context.profile ? {
      id: context.profile.id,
      full_name: context.profile.full_name,
      email: context.profile.email,
      total_due: context.profile.total_due,
      remaining: context.profile.remaining,
    } : undefined,
    payment: context.payment,
    deadline: context.deadline,
    event_name: context.event_name,
  }
}

