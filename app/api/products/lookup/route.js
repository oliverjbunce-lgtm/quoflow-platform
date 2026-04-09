import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'

    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')
    const width = parseInt(searchParams.get('width') || '0')
    const height = parseInt(searchParams.get('height') || '0')
    const core = searchParams.get('core') || 'Hollow Core'
    const finish = searchParams.get('finish') || 'Raw'
    const frame = searchParams.get('frame') || 'LJ&P Standard'

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    // Find product by name
    const productResult = await query(
      'SELECT id, base_price FROM products WHERE tenant_id = ? AND name = ? AND active = 1 LIMIT 1',
      [tenantId, name]
    )
    const product = productResult.rows[0]

    if (!product) {
      return NextResponse.json({ price: null, error: 'Product not found' }, { status: 404 })
    }

    // 1. Check for an exact variant override
    const conditions = ['product_id = ?', 'active = 1']
    const params = [product.id]
    if (width) { conditions.push('width_mm = ?'); params.push(width) }
    if (height) { conditions.push('height_mm = ?'); params.push(height) }
    if (core) { conditions.push('core = ?'); params.push(core) }
    if (finish) { conditions.push('finish = ?'); params.push(finish) }
    if (frame) { conditions.push('frame = ?'); params.push(frame) }

    const variantResult = await query(
      `SELECT price FROM product_variants WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
    )
    const variant = variantResult.rows[0]

    if (variant) {
      return NextResponse.json({ price: variant.price, source: 'variant' })
    }

    // 2. Calculate from base price + modifiers
    const basePrice = product.base_price || 285
    const modResult = await query(
      'SELECT attribute, value, adjustment, adjustment_type FROM product_modifiers WHERE product_id = ?',
      [product.id]
    )
    const modifiers = modResult.rows

    const requestAttrs = {
      width_mm: String(width),
      height_mm: String(height),
      core,
      finish,
      frame,
    }

    let calculatedPrice = basePrice
    for (const mod of modifiers) {
      if (requestAttrs[mod.attribute] === mod.value) {
        if (mod.adjustment_type === 'add') {
          calculatedPrice += mod.adjustment
        } else if (mod.adjustment_type === 'multiply') {
          calculatedPrice *= mod.adjustment
        }
      }
    }

    calculatedPrice = Math.max(calculatedPrice, 50)

    return NextResponse.json({ price: calculatedPrice, source: 'modifiers', base: basePrice })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
