import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET(req, { params }) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = params
    const result = await query(
      'SELECT * FROM product_modifiers WHERE product_id = ? ORDER BY attribute, value',
      [id]
    )
    return NextResponse.json({ modifiers: result.rows })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = params
    const tenantId = session.tenantId || 'demo'
    const { attribute, value, adjustment, adjustment_type = 'add' } = await req.json()
    if (!attribute || value === undefined || adjustment === undefined) {
      return NextResponse.json({ error: 'attribute, value, adjustment required' }, { status: 400 })
    }
    const modId = randomUUID()
    await query(
      'INSERT INTO product_modifiers (id, tenant_id, product_id, attribute, value, adjustment, adjustment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [modId, tenantId, id, attribute, String(value), parseFloat(adjustment), adjustment_type]
    )
    const result = await query('SELECT * FROM product_modifiers WHERE id = ?', [modId])
    return NextResponse.json({ modifier: result.rows[0] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
