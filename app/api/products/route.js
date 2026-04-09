import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET(req) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'

    const productsResult = await query(
      'SELECT * FROM products WHERE tenant_id = ? AND active = 1 ORDER BY name',
      [tenantId]
    )
    const products = productsResult.rows

    const variantsResult = await query(
      `SELECT pv.* FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       WHERE p.tenant_id = ? AND pv.active = 1
       ORDER BY pv.width_mm, pv.height_mm`,
      [tenantId]
    )
    const variants = variantsResult.rows

    const variantMap = {}
    for (const v of variants) {
      if (!variantMap[v.product_id]) variantMap[v.product_id] = []
      variantMap[v.product_id].push(v)
    }

    const result = products.map(p => ({
      ...p,
      variants: variantMap[p.id] || [],
    }))

    return NextResponse.json({ products: result })
  } catch (e) {
    console.error('GET /api/products error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'

    const { name, category = 'door', description } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const id = randomUUID()
    await query(
      'INSERT INTO products (id, tenant_id, name, category) VALUES (?, ?, ?, ?)',
      [id, tenantId, name, category]
    )

    return NextResponse.json({ product: { id, tenant_id: tenantId, name, category, variants: [] } })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'
    const { id } = await req.json()
    await query('UPDATE products SET active = 0 WHERE id = ? AND tenant_id = ?', [id, tenantId])
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
