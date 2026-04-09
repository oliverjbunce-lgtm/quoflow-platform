import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function DELETE(req, { params }) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'
    const { id } = await params
    await query('UPDATE products SET active = 0 WHERE id = ? AND tenant_id = ?', [id, tenantId])
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'
    const { id } = await params
    const { name, category, base_price } = await req.json()
    const fields = []
    const vals = []
    if (name !== undefined) { fields.push('name = ?'); vals.push(name) }
    if (category !== undefined) { fields.push('category = ?'); vals.push(category) }
    if (base_price !== undefined) { fields.push('base_price = ?'); vals.push(parseFloat(base_price)) }
    if (fields.length > 0) {
      vals.push(id, tenantId)
      await query(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, vals)
    }
    const result = await query('SELECT * FROM products WHERE id = ?', [id])
    return NextResponse.json({ product: result.rows[0] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
