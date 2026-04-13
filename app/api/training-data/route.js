import { NextResponse } from 'next/server'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAuth(req)
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result = await query(`
      SELECT
        d.id,
        d.class_name AS corrected_class,
        d.raw_class,
        d.raw_confidence,
        d.raw_bbox,
        d.x1, d.y1, d.x2, d.y2,
        d.is_user_added,
        d.correction_type,
        d.corrected_at,
        a.plan_id,
        a.page_num
      FROM detections d
      JOIN analyses a ON d.analysis_id = a.id
      WHERE (d.correction_type IS NOT NULL OR d.is_user_added = 1)
        AND (d.deleted IS NULL OR d.deleted = 0)
      ORDER BY d.corrected_at DESC
    `)

    return NextResponse.json({
      total: result.rows.length,
      corrections: result.rows,
    })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
