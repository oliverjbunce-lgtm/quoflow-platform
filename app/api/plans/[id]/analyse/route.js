import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { readFile } from 'fs/promises'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { analyseFloorPlanPDF } from '@/lib/api'

export async function POST(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id: planId } = await params
    const { pageNums = [1] } = await req.json()

    // Verify plan belongs to tenant
    const planResult = await query('SELECT * FROM plans WHERE id = ? AND tenant_id = ?', [planId, user.tenantId])
    const plan = planResult.rows[0]
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const pageNum = pageNums[0] || 1
    const analysisId = randomUUID()

    // Create analysis record
    await query(
      'INSERT INTO analyses (id, plan_id, tenant_id, page_num, status) VALUES (?, ?, ?, ?, ?)',
      [analysisId, planId, user.tenantId, pageNum, 'processing']
    )

    // Read PDF from disk and send to HF Space API
    let result
    if (plan.file_path) {
      try {
        const pdfBuffer = await readFile(plan.file_path)
        result = await analyseFloorPlanPDF(pdfBuffer, pageNum)
      } catch (fileErr) {
        console.error('Could not read PDF file:', fileErr.message)
        result = { success: false, error: 'Could not read plan file' }
      }
    } else {
      console.warn('No file_path on plan — cannot call HF API')
      result = { success: false, error: 'No plan file found' }
    }

    // If analysis failed, mark analysis record as failed and return error — no fake data
    if (!result.success) {
      await query('UPDATE analyses SET status = ? WHERE id = ?', ['failed', analysisId])
      return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
    }

    // Store detections
    const detections = result.detections || []
    for (const det of detections) {
      await query(
        'INSERT INTO detections (id, analysis_id, class_name, confidence, bbox_json) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), analysisId, det.class_name, det.confidence || 0.9, JSON.stringify(det.bbox || null)]
      )
    }

    // Update analysis status
    await query('UPDATE analyses SET status = ? WHERE id = ?', ['complete', analysisId])

    await query('UPDATE plans SET page_count = ? WHERE id = ?', [pageNums.length, planId])

    return NextResponse.json({
      analysisId,
      detections,
      count: detections.length,
    })
  } catch (err) {
    console.error('Analyse error:', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
