import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { initDb, query } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(req) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await query(
      'SELECT * FROM custom_items WHERE tenant_id = ? AND active = 1 ORDER BY created_at DESC',
      [user.tenantId]
    )
    return NextResponse.json({ items: result.rows })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { name, description, default_price, price_type } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const id = randomUUID()
    await query(
      'INSERT INTO custom_items (id, tenant_id, name, description, default_price, price_type) VALUES (?, ?, ?, ?, ?, ?)',
      [id, user.tenantId, name, description || null, default_price || null, price_type || 'fixed']
    )
    const result = await query('SELECT * FROM custom_items WHERE id = ?', [id])
    return NextResponse.json({ item: result.rows[0] }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
