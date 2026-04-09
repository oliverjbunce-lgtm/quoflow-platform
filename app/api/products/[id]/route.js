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
    const { name, category } = await req.json()
    await query(
      'UPDATE products SET name = ?, category = ? WHERE id = ? AND tenant_id = ?',
      [name, category, id, tenantId]
    )
    const result = await query('SELECT * FROM products WHERE id = ?', [id])
    return NextResponse.json({ product: result.rows[0] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
