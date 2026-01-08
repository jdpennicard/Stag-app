import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTemplateEmail } from '@/lib/email/send'
import { EmailContext } from '@/lib/email/variables'

/**
 * Deadline Reminder Cron Job
 * 
 * Runs daily via Vercel Cron to send reminder emails based on configured schedules
 * 
 * Security: Protected by secret token in query parameter or header
 */

// Force dynamic rendering (required for cron jobs that use headers/cookies)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('=== Deadline Reminders Cron Started ===')
    console.log('Timestamp:', new Date().toISOString())
    
    // Security check - verify the request is from Vercel Cron or has the correct token
    const userAgent = request.headers.get('user-agent') || ''
    const isVercelCron = userAgent.includes('vercel-cron')
    console.log('User Agent:', userAgent, 'Is Vercel Cron:', isVercelCron)
    
    // If it's not from Vercel Cron, check for token
    if (!isVercelCron) {
      const authHeader = request.headers.get('authorization')
      const token = request.nextUrl.searchParams.get('token')
      const expectedToken = process.env.KEEP_ALIVE_SECRET || process.env.CRON_SECRET

      // If no token is configured, allow the request (for development)
      // In production, you should always set KEEP_ALIVE_SECRET
      if (expectedToken) {
        const providedToken = authHeader?.replace('Bearer ', '') || token
        if (providedToken !== expectedToken) {
          console.error('Unauthorized request - token mismatch')
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseKey,
      supabaseUrlLength: supabaseUrl?.length || 0,
      serviceRoleKeyLength: supabaseKey?.length || 0,
    })

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the deadline_reminder_log table exists (check by trying to query it)
    try {
      const { error: tableCheckError } = await supabase
        .from('deadline_reminder_log')
        .select('id')
        .limit(0)
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        // Table doesn't exist
        return NextResponse.json(
          {
            success: false,
            error: 'deadline_reminder_log table does not exist',
            message: 'Please run the migration: migrations/create-deadline-reminder-log.sql in Supabase SQL Editor',
            hint: 'This table is required for the deadline reminders cron job to work'
          },
          { status: 500 }
        )
      } else if (tableCheckError && tableCheckError.code !== 'PGRST116') {
        // Some other error (PGRST116 is "no rows" which is fine)
        console.warn('Warning checking deadline_reminder_log table:', tableCheckError)
      }
    } catch (err: any) {
      console.error('Exception checking deadline_reminder_log table:', err)
      // Continue anyway - might be a transient error
    }

    // Get all enabled deadline_reminder templates with reminder_days configured
    console.log('Fetching deadline reminder templates...')
    const { data: templates, error: templatesError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('event_type', 'deadline_reminder')
      .eq('enabled', true)
      .not('reminder_days', 'is', null)

    if (templatesError) {
      console.error('Error fetching reminder templates:', templatesError)
      console.error('Error code:', templatesError.code)
      console.error('Error message:', templatesError.message)
      console.error('Error hint:', templatesError.hint)
      return NextResponse.json(
        { 
          error: 'Failed to fetch reminder templates', 
          details: templatesError.message,
          code: templatesError.code,
          hint: templatesError.hint
        },
        { status: 500 }
      )
    }

    console.log(`Found ${templates?.length || 0} deadline reminder template(s)`)

    if (!templates || templates.length === 0) {
      console.log('No deadline reminder templates configured - returning success')
      return NextResponse.json({
        success: true,
        message: 'No deadline reminder templates configured',
        remindersSent: 0,
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalRemindersSent = 0
    const errors: string[] = []

    // Process each template
    for (const template of templates) {
      const reminderDays = template.reminder_days as number[]
      if (!reminderDays || reminderDays.length === 0) {
        continue
      }

      // Process each reminder day for this template
      for (const daysBefore of reminderDays) {
        // Calculate target date (deadline date - days_before)
        const targetDate = new Date(today)
        targetDate.setDate(targetDate.getDate() + daysBefore)

        // Find deadlines that match this target date
        const { data: deadlines, error: deadlinesError } = await supabase
          .from('payment_deadlines')
          .select('*')
          .eq('due_date', targetDate.toISOString().split('T')[0]) // Compare date only

        if (deadlinesError) {
          console.error(`Error fetching deadlines for ${daysBefore} days:`, deadlinesError)
          errors.push(`Failed to fetch deadlines for ${daysBefore} days reminder`)
          continue
        }

        if (!deadlines || deadlines.length === 0) {
          // No deadlines match this date - that's fine, just continue
          continue
        }

        // For each deadline, find profiles with remaining balance
        for (const deadline of deadlines) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_admin', false)
            .not('email', 'is', null) // Only profiles with emails
            .not('user_id', 'is', null) // Only claimed profiles

          if (profilesError) {
            console.error(`Error fetching profiles for deadline ${deadline.id}:`, profilesError)
            errors.push(`Failed to fetch profiles for deadline ${deadline.label}`)
            continue
          }

          if (!profiles || profiles.length === 0) {
            continue
          }

          // Process each profile
          for (const profile of profiles) {
            // Check if we've already sent a reminder today for this template/deadline/profile/day
            const todayStr = today.toISOString().split('T')[0]
            let existingLog = null
            try {
              const { data, error } = await supabase
                .from('deadline_reminder_log')
                .select('id')
                .eq('template_id', template.id)
                .eq('deadline_id', deadline.id)
                .eq('profile_id', profile.id)
                .eq('days_before', daysBefore)
                .eq('sent_date', todayStr)
                .single()
              
              if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error checking existing log:', error)
                // Continue anyway - don't fail the whole process
              } else if (data) {
                existingLog = data
              }
            } catch (err: any) {
              console.error('Exception checking existing log:', err)
              // Continue anyway - table might not exist yet
            }

          if (existingLog) {
            // Already sent today, skip
            continue
          }

          // Calculate remaining balance
          let confirmedFromPayments = 0
          try {
            const { data: payments, error: paymentsError } = await supabase
              .from('payments')
              .select('amount, status')
              .eq('user_id', profile.user_id)
              .eq('status', 'confirmed')

            if (paymentsError) {
              console.error(`Error fetching payments for profile ${profile.id}:`, paymentsError)
              // Continue with 0 if we can't fetch payments
            } else {
              confirmedFromPayments = payments?.reduce(
                (sum, p) => sum + Number(p.amount),
                0
              ) || 0
            }
          } catch (err: any) {
            console.error(`Exception fetching payments for profile ${profile.id}:`, err)
            // Continue with 0 if there's an error
          }

          const confirmedTotal = Number(profile.initial_confirmed_paid) + confirmedFromPayments
          const totalDue = Number(profile.total_due) || 0
          const remaining = totalDue - confirmedTotal

          // Only send if there's a remaining balance
          if (remaining <= 0) {
            continue
          }

          // Calculate days away
          const deadlineDate = new Date(deadline.due_date)
          const daysAway = Math.ceil(
            (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )

          // Build email context
          const context: EmailContext = {
            profile: {
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
              total_due: totalDue,
              initial_confirmed_paid: Number(profile.initial_confirmed_paid) || 0,
              confirmed_total: confirmedTotal,
              remaining: remaining,
            },
            deadline: {
              id: deadline.id,
              label: deadline.label,
              due_date: deadline.due_date,
              suggested_amount: deadline.suggested_amount ? Number(deadline.suggested_amount) : undefined,
              days_away: daysAway,
            },
            event_name: process.env.NEXT_PUBLIC_STAG_EVENT_NAME || "Owen's Stag 2026 - Bournemouth",
            dashboard_url: process.env.NEXT_PUBLIC_APP_URL 
              ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
              : undefined,
          }

          // Send the email (pass supabase client for cron job context)
          const emailResult = await sendTemplateEmail(
            'deadline_reminder',
            profile.email,
            profile.full_name,
            context,
            { 
              logEmail: true,
              supabaseClient: supabase // Pass the service role client
            }
          )

            if (emailResult.success) {
              // Log the reminder (don't fail if logging fails)
              try {
                const { error: logError } = await supabase
                  .from('deadline_reminder_log')
                  .insert({
                    template_id: template.id,
                    deadline_id: deadline.id,
                    profile_id: profile.id,
                    days_before: daysBefore,
                    sent_date: todayStr, // Explicitly set the date
                    email_log_id: emailResult.messageId || null, // Link to email_log if available
                  })
                
                if (logError) {
                  console.error('Failed to log reminder:', logError)
                  // Don't fail the whole process if logging fails
                }
              } catch (logErr: any) {
                console.error('Exception logging reminder:', logErr)
                // Don't fail the whole process if logging fails
              }

              totalRemindersSent++
            } else {
              errors.push(
                `Failed to send reminder to ${profile.email} for deadline ${deadline.label}: ${emailResult.error}`
              )
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${templates.length} reminder template(s)`,
      remindersSent: totalRemindersSent,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    // Comprehensive error logging
    console.error('=== Deadline Reminders Cron Error ===')
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    console.error('Error stack:', error.stack)
    
    // Log environment check
    console.error('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasEmailFrom: !!process.env.EMAIL_FROM,
      nodeEnv: process.env.NODE_ENV,
    })
    
    // Try to stringify error for more details
    try {
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    } catch (stringifyError) {
      console.error('Could not stringify error:', stringifyError)
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        errorName: error.name,
        // Include more details in production for debugging
        details: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

