import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAuth(req)

    let sql = 'SELECT * FROM orders WHERE tenant_id = ?'
    const args = [user.tenantId]

    if (user.role === 'builder') {
      sql += ' AND builder_id = ?'
      args.push(user.userId)
    }

    sql += ' ORDER BY created_at DESC LIMIT 100'
    const result = await query(sql, args)
    return NextResponse.json({ orders: result.rows })
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
    const { quoteId, data = {} } = body

    const orderId = randomUUID()
    await query(
      'INSERT INTO orders (id, tenant_id, quote_id, builder_id, status, data_json) VALUES (?, ?, ?, ?, ?, ?)',
      [orderId, user.tenantId, quoteId || null, user.userId, 'pending', JSON.stringify(data)]
    )

    return NextResponse.json({ orderId })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
