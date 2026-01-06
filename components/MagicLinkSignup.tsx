'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MagicLinkSignupProps {
  profileId: string
  token: string
  profileName: string
  profileEmail: string | null
  isPasswordReset?: boolean
}

export default function MagicLinkSignup({ profileId, token, profileName, profileEmail, isPasswordReset = false }: MagicLinkSignupProps) {
  const [email, setEmail] = useState(profileEmail || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const emailPreFilled = !!profileEmail

  // Check if user is coming from password reset
  useEffect(() => {
    if (isPasswordReset) {
      // User just reset their password, check if they're now logged in
      const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // User is logged in after password reset, link the profile
          const { error: linkError } = await supabase
            .from('profiles')
            .update({
              user_id: user.id,
              email: user.email || profileEmail,
              signup_token: null,
              signup_token_expires_at: null,
            })
            .eq('id', profileId)
            .eq('signup_token', token)
            .is('user_id', null)

          if (!linkError) {
            // Successfully linked, redirect to dashboard
            router.push('/dashboard')
            router.refresh()
          }
        }
      }
      checkAuth()
    }
  }, [isPasswordReset, profileId, token, profileEmail, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Use profile email if pre-filled, otherwise use entered email
    const signupEmail = emailPreFilled && profileEmail ? profileEmail : email

    // Validation
    if (!signupEmail || !password) {
      setError('Email and password are required')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // First, check if there's an orphaned auth user for this email
      // If the profile is unclaimed, there should be NO auth user
      // If one exists, it's orphaned and should be deleted
      try {
        const cleanupResponse = await fetch('/api/signup/check-and-cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: signupEmail, profileId }),
        })

        const cleanupData = await cleanupResponse.json()
        if (cleanupData.error) {
          console.warn('Cleanup warning:', cleanupData.error)
          // Continue anyway - might not have service role key
        } else if (cleanupData.cleaned) {
          console.log('Cleaned up orphaned auth user')
        }
      } catch (cleanupError) {
        console.warn('Could not check for orphaned auth users:', cleanupError)
        // Continue anyway - this is not critical
      }

      let userId: string | null = null
      let session: any = null

      // Since this is a magic link for an unclaimed profile, we should:
      // 1. Try to create new account (profile is unclaimed, so no auth user should exist)
      // 2. If that fails with "already registered", something went wrong
      
      // Step 1: Try to create new account (profile is unclaimed, so no auth user should exist)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password,
      })

      if (!signUpError && authData.user) {
        // New account created successfully!
        console.log('New account created')
        userId = authData.user.id
        session = authData.session

        // If no session after signup, try to sign in
        if (!session) {
          const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
            email: signupEmail,
            password,
          })
          if (!retryError && retrySignIn.session) {
            session = retrySignIn.session
          }
        }
      } else if (signUpError) {
        // Signup failed - check why
        const errorMessage = signUpError.message?.toLowerCase() || ''
        if (errorMessage.includes('already registered') || errorMessage.includes('user already exists')) {
          // This shouldn't happen if cleanup worked, but if it does, try to sign in
          console.warn('Account exists after cleanup attempt, trying to sign in...')
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: signupEmail,
            password,
          })

          if (!signInError && signInData.user) {
            // Sign in succeeded
            userId = signInData.user.id
            session = signInData.session
          } else {
            // Sign in also failed - password is wrong
            setError('An account with this email already exists, but the password is incorrect. Please use the password reset option below.')
            setShowPasswordReset(true)
            setLoading(false)
            return
          }
        } else {
          // Some other signup error
          throw signUpError
        }
      }

      if (!userId) {
        throw new Error('Failed to get user ID')
      }

      // Link the profile to the user
      const { error: linkError } = await supabase
        .from('profiles')
        .update({
          user_id: userId,
          email: signupEmail, // Ensure email is set (use profile email or signup email)
          signup_token: null, // Clear the token after successful signup
          signup_token_expires_at: null,
        })
        .eq('id', profileId)
        .eq('signup_token', token) // Double-check token matches
        .is('user_id', null) // Only update if still unclaimed

      if (linkError) {
        console.error('Failed to link profile:', linkError)
        throw new Error('Failed to link your profile. Please try again or contact support.')
      }

      // If we don't have a session yet, try one more time to sign in
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: signupEmail,
          password,
        })
        if (!signInError && signInData.session) {
          session = signInData.session
        }
      }

      // Success! Wait a moment for session to be established, then redirect
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refresh the router to ensure the session is picked up
      router.refresh()
      
      // Then redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'An error occurred during signup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setResettingPassword(true)
    setError(null)

    // Use profile email if pre-filled, otherwise use entered email
    const resetEmail = emailPreFilled && profileEmail ? profileEmail : email

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/signup/${profileId}/${token}?reset=true`,
      })

      if (resetError) {
        throw resetError
      }

      setError(null)
      setShowPasswordReset(false)
      alert('Password reset email sent! Please check your email and follow the link to set a new password.')
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email')
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          {process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "Owen's Stag 2026 - Bournemouth"}
        </h1>
        <p className="text-center text-gray-600 mb-2">Welcome, {profileName}!</p>
        <p className="text-center text-sm text-gray-500 mb-8">
          Create your account to access your payment dashboard
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
              {showPasswordReset && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resettingPassword}
                    className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    {resettingPassword ? 'Sending...' : 'Send Password Reset Email'}
                  </button>
                  <p className="text-xs text-gray-600 mt-2">
                    We'll send a password reset link to {emailPreFilled && profileEmail ? profileEmail : email}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={emailPreFilled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                emailPreFilled ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
              }`}
              placeholder={emailPreFilled ? email : "your.email@example.com"}
            />
            {emailPreFilled && (
              <p className="text-xs text-gray-500 mt-1">
                Email address is pre-filled from your profile
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

