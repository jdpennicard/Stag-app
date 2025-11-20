import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { profileId } = await request.json()
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Check if profile exists and is unclaimed
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId as any)
      .is('user_id', null)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found or already claimed' }, { status: 404 })
    }

    // Cast profile to any to avoid TypeScript errors
    const profileData: any = profile as any

    // Claim the profile - update without selecting to avoid RLS issues
    const updateData: any = {
      user_id: user.id,
      email: profileData.email || user.email || null,
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId as any)
      .is('user_id', null) // Only update if still unclaimed

    if (updateError) {
      console.error('Failed to claim profile:', updateError)
      return NextResponse.json({ 
        error: 'Failed to claim profile', 
        details: updateError.message 
      }, { status: 500 })
    }

    // Verify the update worked by checking if we can now see the profile as our own
    // This uses the "Users can view own profile" RLS policy
    const { data: claimedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId as any)
      .eq('user_id', user.id as any)
      .maybeSingle()

    if (verifyError) {
      console.error('Failed to verify profile claim:', verifyError)
      // The update might have succeeded but RLS is blocking the verification
      // Return success anyway since the update didn't error
      return NextResponse.json({ success: true, warning: 'Update succeeded but verification failed' })
    }

    if (!claimedProfile) {
      return NextResponse.json({ 
        error: 'Profile update may have failed',
        details: 'Unable to verify the profile was claimed. Please try again or contact support.'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

