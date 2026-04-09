import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req) {
  try {
    initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'

    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')
    const width = parseInt(searchParams.get('width') || '0')
    const height = parseInt(searchParams.get('height') || '0')
    const core = searchParams.get('core') || 'Hollow Core'
    const finish = searchParams.get('finish') || 'Raw'
    const frame = searchParams.get('frame') || "LJ&P Standard"

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    // Find product by name
    const product = query(
      'SELECT id FROM products WHERE tenant_id = ? AND name = ? AND active = 1 LIMIT 1',
      [tenantId, name]
    ).rows[0]

    if (!product) {
      return NextResponse.json({ price: null, error: 'Product not found' }, { status: 404 })
    }

    // Find variant
    const conditions = ['product_id = ?', 'active = 1']
    const params = [product.id]

    if (width) { conditions.push('width_mm = ?'); params.push(width) }
    if (height) { conditions.push('height_mm = ?'); params.push(height) }
    if (core) { conditions.push('core = ?'); params.push(core) }
    if (finish) { conditions.push('finish = ?'); params.push(finish) }
    if (frame) { conditions.push('frame = ?'); params.push(frame) }

    const variant = query(
      `SELECT price FROM product_variants WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
    ).rows[0]

    if (!variant) {
      // Fallback: find closest variant by product
      const fallback = query(
        'SELECT price FROM product_variants WHERE product_id = ? AND active = 1 LIMIT 1',
        [product.id]
      ).rows[0]
      return NextResponse.json({ price: fallback?.price || null })
    }

    return NextResponse.json({ price: variant.price })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
