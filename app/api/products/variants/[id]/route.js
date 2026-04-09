import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PUT(req, { params }) {
  try {
    initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const body = await req.json()
    const { price, sku, width_mm, height_mm, core, finish, frame, active } = body

    const fields = []
    const values = []

    if (price !== undefined) { fields.push('price = ?'); values.push(price) }
    if (sku !== undefined) { fields.push('sku = ?'); values.push(sku) }
    if (width_mm !== undefined) { fields.push('width_mm = ?'); values.push(width_mm) }
    if (height_mm !== undefined) { fields.push('height_mm = ?'); values.push(height_mm) }
    if (core !== undefined) { fields.push('core = ?'); values.push(core) }
    if (finish !== undefined) { fields.push('finish = ?'); values.push(finish) }
    if (frame !== undefined) { fields.push('frame = ?'); values.push(frame) }
    if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0) }

    if (!fields.length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    values.push(id)
    query(`UPDATE product_variants SET ${fields.join(', ')} WHERE id = ?`, values)

    const updated = query('SELECT * FROM product_variants WHERE id = ?', [id]).rows[0]
    return NextResponse.json({ variant: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
