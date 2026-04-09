import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PUT(req, { params }) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = params
    const { adjustment, adjustment_type, value, attribute } = await req.json()
    await query(
      'UPDATE product_modifiers SET adjustment = COALESCE(?, adjustment), adjustment_type = COALESCE(?, adjustment_type), value = COALESCE(?, value), attribute = COALESCE(?, attribute) WHERE id = ?',
      [adjustment ?? null, adjustment_type ?? null, value ?? null, attribute ?? null, id]
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = params
    await query('DELETE FROM product_modifiers WHERE id = ?', [id])
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
