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
 * 
 * @param templateNameOrEventType - Template name or event_type to find
 * @param supabaseClient - Optional Supabase client (uses createServerClient if not provided)
 */
export async function getEmailTemplate(
  templateNameOrEventType: string,
  supabaseClient?: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>
): Promise<EmailTemplate | null> {
  const supabase = supabaseClient || createServerClient()
  
  // Try to find by ID first (UUID format), then by name, then by event_type
  // Check if it looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateNameOrEventType)
  
  if (isUUID) {
    const { data: templateById, error: errorById } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateNameOrEventType)
      .eq('enabled', true)
      .single()

    if (!errorById && templateById) {
      return templateById as EmailTemplate
    }
  }
  
  // Try to find by name
  const { data: templateByName, error: errorByName } = await supabase
    .from('email_templates')
    .select('*')
    .eq('name', templateNameOrEventType)
    .eq('enabled', true)
    .single()

  if (!errorByName && templateByName) {
    return templateByName as EmailTemplate
  }

  // Try to find by event_type (but this can return multiple, so we'll take the first one)
  const { data: templatesByEvent, error: errorByEvent } = await supabase
    .from('email_templates')
    .select('*')
    .eq('event_type', templateNameOrEventType)
    .eq('enabled', true)
    .limit(1) // Use limit instead of single to avoid errors with multiple templates

  if (!errorByEvent && templatesByEvent && templatesByEvent.length > 0) {
    return templatesByEvent[0] as EmailTemplate
  }

  return null
}

/**
 * Send an email using a template from the database
 * 
 * @param templateNameOrEventType - Template name or event_type to use
 * @param recipientEmail - Recipient email address
 * @param recipientName - Recipient name
 * @param context - Email context with variables
 * @param options - Optional settings including Supabase client for cron jobs
 */
export async function sendTemplateEmail(
  templateNameOrEventType: string,
  recipientEmail: string,
  recipientName: string,
  context: EmailContext,
  options?: { 
    from?: string
    logEmail?: boolean
    supabaseClient?: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>
  }
): Promise<{ success: boolean; messageId?: string; error?: string; templateId?: string; emailLogId?: string }> {
  const template = await getEmailTemplate(templateNameOrEventType, options?.supabaseClient)
  
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
  let emailLogId: string | null = null
  if (options?.logEmail !== false && result.success) {
    emailLogId = await logEmail({
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
    }, options?.supabaseClient)
  } else if (options?.logEmail !== false && !result.success) {
    emailLogId = await logEmail({
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
    }, options?.supabaseClient)
  }

  return {
    ...result,
    templateId: template.id,
    emailLogId: emailLogId || undefined,
  }
}

/**
 * Log an email to the database
 * Returns the email_log ID if successful
 */
async function logEmail(
  data: {
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
  },
  supabaseClient?: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    // Use service role key to bypass RLS for logging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Cannot log email - Supabase credentials missing')
      return null
    }

    // Always use service role client for logging (bypasses RLS)
    // This ensures consistent behavior whether called from cron or regular API
    // If a client was passed, use it; otherwise create a new service role client
    const supabaseAdmin = supabaseClient 
      ? (supabaseClient as any) // Type assertion needed for union type compatibility
      : createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

    const { data: insertedData, error } = await supabaseAdmin.from('email_log').insert({
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
    }).select('id').single()

    if (error) {
      console.error('Error logging email:', error)
      return null
    }

    return insertedData?.id || null
  } catch (err) {
    console.error('Error logging email:', err)
    // Don't throw - email logging failure shouldn't break email sending
    return null
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

