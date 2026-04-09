import { NextResponse } from 'next/server'
import { query, initDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function POST(req) {
  try {
    initDb()
    const session = await requireAuth(req).catch(() => null)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = session.tenantId || 'demo'

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())

    let imported = 0
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim())
      const row = {}
      headers.forEach((h, idx) => { row[h] = vals[idx] })

      const { product_name, category = 'door', sku, width_mm, height_mm, core, finish, frame, price } = row
      if (!product_name || !price) continue

      // Upsert product
      let product = query('SELECT id FROM products WHERE tenant_id = ? AND name = ?', [tenantId, product_name]).rows[0]
      if (!product) {
        const pid = randomUUID()
        query('INSERT INTO products (id, tenant_id, name, category) VALUES (?, ?, ?, ?)', [pid, tenantId, product_name, category])
        product = { id: pid }
      }

      // Insert variant
      const vid = randomUUID()
      query(
        'INSERT OR REPLACE INTO product_variants (id, product_id, sku, width_mm, height_mm, core, finish, frame, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [vid, product.id, sku || null, parseInt(width_mm) || null, parseInt(height_mm) || null, core || null, finish || null, frame || null, parseFloat(price) || 0]
      )
      imported++
    }

    return NextResponse.json({ imported })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
