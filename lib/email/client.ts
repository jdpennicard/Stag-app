/**
 * Resend Email Client
 * 
 * Handles email sending via Resend API
 */

import { Resend } from 'resend'
import { substituteVariables, EmailContext } from './variables'

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@resend.dev'

/**
 * Get or create Resend client instance
 * Checks for API key dynamically to handle env variable loading
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set - email sending will be disabled')
    return null
  }

  try {
    return new Resend(apiKey)
  } catch (err) {
    console.error('Failed to create Resend client:', err)
    return null
  }
}

export interface SendEmailOptions {
  to: string
  subject: string
  bodyText: string
  bodyHtml?: string
  from?: string
}

/**
 * Send an email via Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = getResendClient()
  
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    console.error('Resend client not initialized - RESEND_API_KEY missing or invalid', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 3) || 'none'
    })
    return { success: false, error: 'Email service not configured. Please check RESEND_API_KEY in your environment variables.' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: options.from || EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.bodyText,
      html: options.bodyHtml || options.bodyText.replace(/\n/g, '<br>'),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message || 'Failed to send email' }
    }

    return { success: true, messageId: data?.id }
  } catch (err: any) {
    console.error('Error sending email:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}

// Note: sendTemplateEmail is now in lib/email/send.ts
// This function is kept for backwards compatibility but should not be used

