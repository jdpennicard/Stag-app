import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

/**
 * Debug endpoint to check environment variables
 * Admin only for security
 */
export async function GET(request: NextRequest) {
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

    // Check for RESEND_API_KEY
    const resendKey = process.env.RESEND_API_KEY
    const hasResendKey = !!resendKey

    return NextResponse.json({
      resend_api_key: {
        exists: hasResendKey,
        length: resendKey?.length || 0,
        prefix: resendKey?.substring(0, 5) || 'none',
        // Don't expose the full key, just first 5 chars for verification
      },
      email_from: process.env.EMAIL_FROM || 'not set',
      node_env: process.env.NODE_ENV,
      // Show a few other env vars to verify .env.local is being read
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_admin_emails: !!process.env.ADMIN_EMAILS,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

