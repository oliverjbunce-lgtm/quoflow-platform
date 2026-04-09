import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function PUT(req, { params }) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { name, description, default_price, price_type } = await req.json()
    await query(
      'UPDATE custom_items SET name = ?, description = ?, default_price = ?, price_type = ? WHERE id = ? AND tenant_id = ?',
      [name, description || null, default_price || null, price_type || 'fixed', id, user.tenantId]
    )
    const result = await query('SELECT * FROM custom_items WHERE id = ?', [id])
    return NextResponse.json({ item: result.rows[0] })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await query('UPDATE custom_items SET active = 0 WHERE id = ? AND tenant_id = ?', [id, user.tenantId])
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
