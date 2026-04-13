import { NextResponse } from 'next/server'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const result = await query('SELECT onboarding_completed FROM users WHERE id = ?', [user.userId])
    return NextResponse.json({ completed: !!result.rows[0]?.onboarding_completed })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const body = await req.json().catch(() => ({}))
    const value = body.reset ? 0 : 1
    await query('UPDATE users SET onboarding_completed = ? WHERE id = ?', [value, user.userId])
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
