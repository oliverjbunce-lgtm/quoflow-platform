import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function GET(req) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await query(
      'SELECT * FROM notifications WHERE tenant_id = ? AND (user_id IS NULL OR user_id = ?) ORDER BY created_at DESC LIMIT 50',
      [user.tenantId, user.userId]
    )
    return NextResponse.json({ notifications: result.rows })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
