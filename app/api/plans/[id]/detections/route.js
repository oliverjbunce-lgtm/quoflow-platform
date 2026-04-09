import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function POST(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id: planId } = await params
    const { class_name, bbox, page_num = 1, specs } = await req.json()

    // Find or create analysis for this page
    let analysisResult = await query(
      'SELECT id FROM analyses WHERE plan_id = ? AND page_num = ?',
      [planId, page_num]
    )
    let analysisId = analysisResult.rows[0]?.id
    if (!analysisId) {
      analysisId = randomUUID()
      await query(
        'INSERT INTO analyses (id, plan_id, tenant_id, page_num, status) VALUES (?, ?, ?, ?, ?)',
        [analysisId, planId, user.tenantId, page_num, 'manual']
      )
    }

    const detId = randomUUID()
    await query(
      'INSERT INTO detections (id, analysis_id, class_name, confidence, bbox_json, specs_json, is_correction) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [detId, analysisId, class_name, 1.0, JSON.stringify(bbox || []), JSON.stringify(specs || {}), 1]
    )

    return NextResponse.json({ id: detId })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
