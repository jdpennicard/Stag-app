import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { getWeekendStarted } from '@/lib/weekend'
import Navigation from '@/components/Navigation'
import HeadbandsGame from '@/components/HeadbandsGame'

export default async function HeadbandsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/claim-profile')
  }

  const profileData: any = profile as any
  const isStagOnly = !!profileData.is_stag_only
  const weekendMode = await getWeekendStarted()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">🎭 Headbands</h1>
            <Navigation isStagOnly={isStagOnly} weekendMode={weekendMode} />
          </div>
        </div>
        <HeadbandsGame />
      </div>
    </div>
  )
}
