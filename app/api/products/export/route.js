import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req) {
  try {
    initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'

    const rows = query(
      `SELECT p.name as product_name, p.category, pv.sku, pv.width_mm, pv.height_mm,
              pv.core, pv.finish, pv.frame, pv.price, pv.active
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       WHERE p.tenant_id = ?
       ORDER BY p.name, pv.width_mm, pv.height_mm`,
      [tenantId]
    ).rows

    const headers = ['product_name', 'category', 'sku', 'width_mm', 'height_mm', 'core', 'finish', 'frame', 'price', 'active']
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="products.csv"',
      }
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
