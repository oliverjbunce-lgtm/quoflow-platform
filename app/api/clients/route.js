import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const result = await query('SELECT * FROM clients WHERE tenant_id = ? ORDER BY name', [user.tenantId])
    return NextResponse.json({ clients: result.rows })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { name, company, email, phone } = await req.json()
    const id = randomUUID()
    await query(
      'INSERT INTO clients (id, tenant_id, name, company, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [id, user.tenantId, name, company || '', email || '', phone || '']
    )
    return NextResponse.json({ id })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
