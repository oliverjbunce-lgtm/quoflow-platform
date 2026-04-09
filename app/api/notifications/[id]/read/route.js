import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function POST(req, { params }) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await query('UPDATE notifications SET read = 1 WHERE id = ? AND tenant_id = ?', [id, user.tenantId])
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
