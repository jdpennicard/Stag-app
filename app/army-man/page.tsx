import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import Navigation from '@/components/Navigation'
import ArmyManGameContent from '@/components/ArmyManGameContent'

export default async function ArmyManPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/')
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/claim-profile')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">🪖 The Army Man Game</h1>
            <Navigation />
          </div>
        </div>
        <ArmyManGameContent />
      </div>
    </div>
  )
}
