import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { getWeekendStarted } from '@/lib/weekend'
import Navigation from '@/components/Navigation'

export default async function GamesPage() {
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

  const games = [
    {
      href: '/army-man',
      title: '🪖 Army Man Game',
      description: 'Freeze in your soldier pose when the Lookout shouts. Track marks and pick the new Lookout.',
    },
    {
      href: '/headbands',
      title: '🎭 Headbands',
      description: 'Get a random word, put your phone on your head, and ask questions to guess what you are. 200 items, pick a category or go random.',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Games</h1>
            <Navigation isAdmin={false} isStagOnly={isStagOnly} weekendMode={weekendMode} />
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          {isStagOnly
            ? 'Pick a game to play.'
            : 'Weekend games — tap to open.'}
        </p>

        <div className="space-y-4">
          {games.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {game.title}
              </h2>
              <p className="text-sm text-gray-600">{game.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
