import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAuth(req)

    const plans = await query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM analyses a WHERE a.plan_id = p.id) as analysis_count,
        (SELECT COUNT(*) FROM detections d
          JOIN analyses a ON d.analysis_id = a.id
          WHERE a.plan_id = p.id AND (d.deleted IS NULL OR d.deleted = 0)) as detection_count
      FROM plans p
      WHERE p.tenant_id = ?
      ORDER BY p.created_at DESC
    `, [user.tenantId])

    return NextResponse.json({ plans: plans.rows })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
