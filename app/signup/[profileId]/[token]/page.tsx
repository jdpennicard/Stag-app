import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import MagicLinkSignup from '@/components/MagicLinkSignup'

interface PageProps {
  params: {
    profileId: string
    token: string
  }
}

export default async function SignupPage({ params, searchParams }: PageProps & { searchParams?: { reset?: string } }) {
  const { profileId, token } = params
  const isPasswordReset = searchParams?.reset === 'true'

  // Check if user is already logged in
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is already logged in, check if they have a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', user.id as any)
      .single()

    if (existingProfile) {
      // User already has a profile, redirect to dashboard
      redirect('/dashboard')
    }

    // User is logged in but doesn't have a profile yet
    // Check if this is the right profile for them and auto-link it
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, signup_token, signup_token_expires_at, user_id')
      .eq('id', profileId as any)
      .single()

    if (targetProfile) {
      const targetProfileData: any = targetProfile as any
      
      // Verify token matches and profile is unclaimed
      if (targetProfileData.signup_token === token && !targetProfileData.user_id) {
        // Check if token is expired
        const isExpired = targetProfileData.signup_token_expires_at && 
          new Date(targetProfileData.signup_token_expires_at) < new Date()
        
        if (!isExpired) {
          // Auto-link the profile to the logged-in user
          const { error: linkError } = await supabase
            .from('profiles')
            .update({
              user_id: user.id,
              email: user.email || targetProfileData.email,
              signup_token: null,
              signup_token_expires_at: null,
            })
            .eq('id', profileId as any)
            .eq('signup_token', token)
            .is('user_id', null)

          if (!linkError) {
            // Successfully linked, redirect to dashboard
            redirect('/dashboard')
          }
        }
      }
    }
  }

  // Verify the token and profile
  // Note: This query should work for unauthenticated users if the RLS policy is set up correctly
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, signup_token, signup_token_expires_at, user_id')
    .eq('id', profileId as any)
    .eq('signup_token', token) // Filter by token to leverage RLS policy
    .single()

  if (error || !profile) {
    console.error('Error fetching profile for signup:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-4 text-red-600">Invalid Link</h1>
          <p className="text-center text-gray-600 mb-2">
            This signup link is invalid or has expired. Please contact an administrator for a new link.
          </p>
          {process.env.NODE_ENV === 'development' && error && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Debug: {error.message}
            </p>
          )}
        </div>
      </div>
    )
  }

  const profileData: any = profile as any

  // Check if profile is already claimed
  if (profileData.user_id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-4 text-yellow-600">Already Claimed</h1>
          <p className="text-center text-gray-600">
            This profile has already been claimed. If this is your profile, please log in instead.
          </p>
        </div>
      </div>
    )
  }

  // Check if token matches
  if (profileData.signup_token !== token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-4 text-red-600">Invalid Token</h1>
          <p className="text-center text-gray-600">
            This signup link is invalid. Please contact an administrator for a new link.
          </p>
        </div>
      </div>
    )
  }

  // Check if token has expired
  if (profileData.signup_token_expires_at) {
    const expiresAt = new Date(profileData.signup_token_expires_at)
    if (expiresAt < new Date()) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
            <h1 className="text-2xl font-bold text-center mb-4 text-red-600">Link Expired</h1>
            <p className="text-center text-gray-600">
              This signup link has expired. Please contact an administrator for a new link.
            </p>
          </div>
        </div>
      )
    }
  }

  // All checks passed - show signup form
  return <MagicLinkSignup 
    profileId={profileId} 
    token={token} 
    profileName={profileData.full_name}
    profileEmail={profileData.email || null}
    isPasswordReset={isPasswordReset}
  />
}

