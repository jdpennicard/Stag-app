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

  // Cast profile to any to avoid TypeScript errors
  const profileData: any = profile as any

  const supabase = createServerClient()

  // Fetch payments - if admin, fetch all pending payments; otherwise just their own
  let payments: any[] = []
  if (profileData.is_admin) {
    const { data: allPayments } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
    payments = (allPayments || []) as any[]
  } else {
    const { data: userPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id as any)
      .order('created_at', { ascending: false })
    payments = (userPayments || []) as any[]
  }

  // Fetch deadlines
  const { data: deadlines } = await supabase
    .from('payment_deadlines')
    .select('*')
    .order('due_date', { ascending: true })
  const deadlinesArray: any[] = (deadlines || []) as any[]
  
  // If admin, also fetch all profiles for payment approval (including unlinked ones)
  let allProfiles: any[] = []
  if (profileData.is_admin) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email')
    allProfiles = (profiles || []) as any[]
  }

  // Calculate totals
  const confirmedFromPayments =
    payments.filter((p: any) => p.status === 'confirmed').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const confirmedTotal = Number(profileData.initial_confirmed_paid) + confirmedFromPayments
  const pendingTotal =
    payments.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const remaining = Number(profileData.total_due) - confirmedTotal

  return (
    <DashboardContent
      profile={profileData}
      payments={payments}
      deadlines={deadlinesArray}
      confirmedTotal={confirmedTotal}
      pendingTotal={pendingTotal}
      remaining={remaining}
      isAdmin={profileData.is_admin}
      allProfiles={allProfiles}
      currentUserId={user.id}
    />
  )
}

