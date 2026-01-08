/**
 * Helper function to get the event name from database or fallback to env var
 */
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function getEventName(
  supabaseClient?: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>
): Promise<string> {
  try {
    let supabase = supabaseClient
    
    if (!supabase) {
      // Try to use server client first
      try {
        supabase = createServerClient()
      } catch {
        // If that fails (e.g., in cron jobs), use service role
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        if (supabaseUrl && supabaseServiceKey) {
          supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          })
        } else {
          // Fallback to env var if no Supabase credentials
          return process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "YOUR EVENT NAME"
        }
      }
    }

    const { data: stagDates } = await supabase
      .from('stag_dates')
      .select('event_name')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return stagDates?.event_name || process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "YOUR EVENT NAME"
  } catch (error) {
    console.warn('Error fetching event name from database, using env var:', error)
    return process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "YOUR EVENT NAME"
  }
}

