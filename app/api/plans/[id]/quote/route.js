import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function POST(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id: planId } = await params
    let body = {}
    try { body = await req.json() } catch {}
    const { client_name, notes } = body

    const planResult = await query('SELECT * FROM plans WHERE id = ? AND tenant_id = ?', [planId, user.tenantId])
    const plan = planResult.rows[0]
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Get all non-deleted detections
    const detResult = await query(`
      SELECT d.* FROM detections d
      JOIN analyses a ON d.analysis_id = a.id
      WHERE a.plan_id = ? AND (d.deleted IS NULL OR d.deleted = 0)
    `, [planId])

    const detections = detResult.rows

    // Build quote items — use corrected_class if available
    const items = detections.map(det => {
      let specs = {}
      try { specs = JSON.parse(det.specs_json || '{}') } catch {}
      const className = det.corrected_class || det.class_name
      const specStr = [
        specs.width_mm && `${specs.width_mm}mm`,
        specs.height_mm && `${specs.height_mm}mm`,
        specs.core,
        specs.finish,
        specs.frame,
      ].filter(Boolean).join(' · ')
      return {
        name: className.replace(/_/g, ' '),
        specs: specStr,
        qty: 1,
        unit_price: det.unit_price || 285,
        total: det.unit_price || 285,
      }
    })

    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const gst = subtotal * 0.15
    const total = subtotal + gst
    const quoteId = `Q-${Date.now().toString(36).toUpperCase()}`

    await query(
      `INSERT INTO quotes (id, tenant_id, plan_id, client_name, items_json, subtotal, gst, total, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quoteId, user.tenantId, planId,
       client_name || plan.client_name || 'Client',
       JSON.stringify(items), subtotal, gst, total,
       notes || plan.notes || '', 'draft']
    )

    await query('UPDATE plans SET review_status = ? WHERE id = ?', ['quoted', planId])

    return NextResponse.json({ quoteId, total })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
