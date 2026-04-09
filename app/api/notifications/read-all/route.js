import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function POST(req) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await query(
      'UPDATE notifications SET read = 1 WHERE tenant_id = ? AND (user_id IS NULL OR user_id = ?)',
      [user.tenantId, user.userId]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
