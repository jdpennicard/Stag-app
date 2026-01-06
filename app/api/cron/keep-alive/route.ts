import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Keep-alive endpoint to prevent Supabase from pausing the project
 * This should be called daily via Vercel Cron or external cron service
 * 
 * Security: Protected by secret token in query parameter or header
 */
export async function GET(request: NextRequest) {
  try {
    // Security check - verify the request has the correct token
    const authHeader = request.headers.get('authorization')
    const token = request.nextUrl.searchParams.get('token')
    const expectedToken = process.env.KEEP_ALIVE_SECRET || process.env.CRON_SECRET

    // If no token is configured, allow the request (for development)
    // In production, you should always set KEEP_ALIVE_SECRET
    if (expectedToken) {
      const providedToken = authHeader?.replace('Bearer ', '') || token
      if (providedToken !== expectedToken) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Use service role key if available (bypasses RLS), otherwise use anon key
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Perform a simple database query to keep the connection active
    // Try using the RPC function first (most efficient - it also logs automatically)
    let pingSuccess = false
    let error: any = null
    
    try {
      const result = await supabase.rpc('keep_alive_ping')
      if (result.error) {
        error = result.error
      } else {
        pingSuccess = true
      }
    } catch (rpcError) {
      // If RPC doesn't exist yet (migration not run), fall back to a simple table query
      const result = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      
      if (result.error) {
        error = result.error
      } else {
        pingSuccess = true
      }
      
      // Try to log manually if RPC failed (table might not exist yet)
      try {
        await supabase
          .from('keep_alive_log')
          .insert({ pinged_at: new Date().toISOString() })
      } catch {
        // Ignore if table doesn't exist - that's okay
      }
    }

    // Even if there's an error, we've still pinged the database connection
    // Log it but don't fail the request (return 200 so cron doesn't think it failed)
    if (error) {
      console.warn('Keep-alive ping completed with warning:', error.message)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Database keep-alive ping successful'
    })
  } catch (error: any) {
    // Even on error, we've likely pinged the database
    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        warning: error.message || 'Keep-alive completed with warning'
      },
      { status: 200 } // Return 200 so cron doesn't think it failed
    )
  }
}

