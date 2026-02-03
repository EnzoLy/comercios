import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/dashboard')
  }

  // If user has only one store, redirect to that store's dashboard
  if (session.user.stores && session.user.stores.length === 1) {
    redirect(`/dashboard/${session.user.stores[0].slug}`)
  }

  // Otherwise (0 or >1 stores), go to selection page
  redirect('/dashboard/select-store')
}
