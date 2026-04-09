import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { analyseFloorPlan } from '@/lib/api'

export async function POST(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id: planId } = await params
    const { pageNums = [1], imageBase64 } = await req.json()

    // Verify plan belongs to tenant
    const planResult = await query('SELECT * FROM plans WHERE id = ? AND tenant_id = ?', [planId, user.tenantId])
    if (!planResult.rows[0]) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const analysisId = randomUUID()
    const pageNum = pageNums[0] || 1

    // Create analysis record
    await query(
      'INSERT INTO analyses (id, plan_id, tenant_id, page_num, status, image_b64) VALUES (?, ?, ?, ?, ?, ?)',
      [analysisId, planId, user.tenantId, pageNum, 'processing', imageBase64 || null]
    )

    // Call HF API
    const result = await analyseFloorPlan(imageBase64 || '')

    // Store detections
    const detections = result.detections || []
    for (const det of detections) {
      await query(
        'INSERT INTO detections (id, analysis_id, class_name, confidence, bbox_json) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), analysisId, det.class_name, det.confidence || 0.9, JSON.stringify(det.bbox || {})]
      )
    }

    // Update analysis status
    await query(
      'UPDATE analyses SET status = ?, raw_results_json = ? WHERE id = ?',
      ['complete', JSON.stringify(result.raw || {}), analysisId]
    )

    // Update plan page count
    await query('UPDATE plans SET page_count = ? WHERE id = ?', [pageNums.length, planId])

    return NextResponse.json({
      analysisId,
      detections,
      isMock: result.mock || false,
      count: detections.length,
    })
  } catch (err) {
    console.error('Analyse error:', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
