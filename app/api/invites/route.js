import { NextResponse } from 'next/server'
import { randomUUID, randomBytes } from 'crypto'
import { initDb, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAdmin(req)

    const result = await query(
      'SELECT * FROM invites WHERE tenant_id = ? ORDER BY created_at DESC',
      [user.tenantId]
    )
    return NextResponse.json({ invites: result.rows })
  } catch (err) {
    if (err.message === 'Unauthorized' || err.message === 'Forbidden') {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await initDb()
    const user = await requireAdmin(req)
    const body = await req.json()
    const { label, role = 'builder' } = body

    const token = randomBytes(24).toString('hex')
    const id = randomUUID()

    await query(
      'INSERT INTO invites (id, tenant_id, token, label, role) VALUES (?, ?, ?, ?, ?)',
      [id, user.tenantId, token, label || '', role]
    )

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://quoflow.co.nz'
    const inviteUrl = `${baseUrl}/auth/signup?token=${token}`

    return NextResponse.json({ inviteId: id, token, inviteUrl })
  } catch (err) {
    if (err.message === 'Unauthorized' || err.message === 'Forbidden') {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
