import { redirect } from 'next/navigation'

export default async function AdminPage() {
  // Redirect to default tab
  redirect('/admin/event-info')
}

