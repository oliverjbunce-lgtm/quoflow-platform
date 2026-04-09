import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get('qf_token')?.value

  if (token) {
    const payload = await verifyToken(token)
    if (payload) {
      if (['admin', 'staff'].includes(payload.role)) {
        redirect('/admin/dashboard')
      } else {
        redirect('/portal/dashboard')
      }
    }
  }

  redirect('/auth/login')
}
