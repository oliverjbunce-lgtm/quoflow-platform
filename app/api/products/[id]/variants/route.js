import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function POST(req, { params }) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'
    const { id: productId } = await params

    // Verify product belongs to tenant
    const productResult = await query(
      'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
      [productId, tenantId]
    )
    if (!productResult.rows[0]) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { width_mm, height_mm, core, finish, frame, handing, sku, price } = await req.json()
    if (!price && price !== 0) return NextResponse.json({ error: 'Price is required' }, { status: 400 })

    const variantId = randomUUID()
    const autoSku = sku || [
      productResult.rows[0].name.replace(/[^a-z0-9]/gi, '').substring(0, 6).toUpperCase(),
      width_mm, height_mm,
      core === 'Hollow Core' ? 'HC' : core === 'Solid Core' ? 'SC' : 'FR',
      finish === 'Raw' ? 'RW' : finish === 'Primed' ? 'PR' : 'PW',
      frame === 'LJ&P Standard' ? 'LJ' : frame === 'Rebate Only' ? 'RO' : 'NF',
    ].join('-')

    await query(
      'INSERT INTO product_variants (id, product_id, sku, width_mm, height_mm, core, finish, frame, handing, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [variantId, productId, autoSku, width_mm || null, height_mm || null, core || null, finish || null, frame || null, handing || null, parseFloat(price)]
    )

    const result = await query('SELECT * FROM product_variants WHERE id = ?', [variantId])
    return NextResponse.json({ variant: result.rows[0] }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
