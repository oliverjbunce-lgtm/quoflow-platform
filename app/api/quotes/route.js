import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let sql = 'SELECT * FROM quotes WHERE tenant_id = ?'
    const args = [user.tenantId]

    if (status && status !== 'all') {
      sql += ' AND status = ?'
      args.push(status)
    }

    if (search) {
      sql += ' AND (client_name LIKE ? OR id LIKE ?)'
      args.push(`%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY created_at DESC LIMIT 100'

    const result = await query(sql, args)
    return NextResponse.json({ quotes: result.rows })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const body = await req.json()
    const { analysisId, clientName, items = [], notes = '' } = body

    const subtotal = items.reduce((s, item) => s + (item.qty * item.unit_price), 0)
    const gst = subtotal * 0.15
    const total = subtotal + gst

    // Generate quote ID
    const countResult = await query('SELECT COUNT(*) as c FROM quotes WHERE tenant_id = ?', [user.tenantId])
    const count = Number(countResult.rows[0].c)
    const quoteId = `Q-${String(3000 + count).padStart(4, '0')}`

    await query(
      `INSERT INTO quotes (id, tenant_id, analysis_id, status, client_name, items_json, subtotal, gst, total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quoteId, user.tenantId, analysisId || null, 'draft', clientName || '', JSON.stringify(items), subtotal, gst, total, notes]
    )

    return NextResponse.json({ quoteId, total })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
