import { createServerClient } from '@/lib/supabase/server'

export async function getWeekendStarted(): Promise<boolean> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('stag_dates')
      .select('weekend_started')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return false
    return !!(data as { weekend_started?: boolean } | null)?.weekend_started
  } catch {
    return false
  }
}
