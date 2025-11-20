import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import DashboardContent from '@/components/DashboardContent'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/claim-profile')
  }

  const supabase = createServerClient()

  // Fetch payments - if admin, fetch all pending payments; otherwise just their own
  let payments
  if (profile.is_admin) {
    const { data: allPayments } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
    payments = allPayments
  } else {
    const { data: userPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    payments = userPayments
  }

  // Fetch deadlines
  const { data: deadlines } = await supabase
    .from('payment_deadlines')
    .select('*')
    .order('due_date', { ascending: true })
  
  // If admin, also fetch all profiles for payment approval (including unlinked ones)
  let allProfiles: any[] = []
  if (profile.is_admin) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email')
    allProfiles = profiles || []
  }

  // Calculate totals
  const confirmedFromPayments =
    payments?.filter((p) => p.status === 'confirmed').reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const confirmedTotal = Number(profile.initial_confirmed_paid) + confirmedFromPayments
  const pendingTotal =
    payments?.filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const remaining = Number(profile.total_due) - confirmedTotal

  return (
    <DashboardContent
      profile={profile}
      payments={payments || []}
      deadlines={deadlines || []}
      confirmedTotal={confirmedTotal}
      pendingTotal={pendingTotal}
      remaining={remaining}
      isAdmin={profile.is_admin}
      allProfiles={allProfiles}
      currentUserId={user.id}
    />
  )
}

