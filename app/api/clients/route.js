import { NextResponse } from 'next/server'
import { initDb, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAdmin(req)

    const result = await query(
      `SELECT u.id, u.name, u.email, u.location, u.role, u.created_at,
              COUNT(DISTINCT o.id) as order_count,
              MAX(o.created_at) as last_order_at
       FROM users u
       LEFT JOIN orders o ON o.builder_id = u.id
       WHERE u.tenant_id = ? AND u.role = 'builder'
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [user.tenantId]
    )

    return NextResponse.json({ clients: result.rows })
  } catch (err) {
    if (err.message === 'Unauthorized' || err.message === 'Forbidden') {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
