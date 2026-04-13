import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function PATCH(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id: planId, detId } = await params
    const body = await req.json()

    // Handle class_name correction (training flywheel)
    if (body.class_name !== undefined) {
      await query(
        `UPDATE detections SET
          class_name = ?,
          correction_type = CASE WHEN correction_type IS NULL THEN 'class_changed' ELSE correction_type END,
          corrected_at = ?
         WHERE id = ? AND analysis_id IN (SELECT id FROM analyses WHERE plan_id = ?)`,
        [body.class_name, new Date().toISOString(), detId, planId]
      )
      // Also update corrected_class for backwards compatibility
      await query(`UPDATE detections SET corrected_class = ? WHERE id = ?`, [body.class_name, detId])
    }

    const allowed = ['corrected_class', 'specs_json', 'deleted']
    const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
    if (updates.length > 0) {
      // specs_json should be stored as string
      const processedUpdates = updates.map(([k, v]) => [k, k === 'specs_json' ? JSON.stringify(v) : v])

      // Track deletion
      if (body.deleted !== undefined) {
        processedUpdates.push(['correction_type', 'deleted'])
        processedUpdates.push(['corrected_at', new Date().toISOString()])
      }

      const setClauses = processedUpdates.map(([k]) => `${k} = ?`).join(', ')
      await query(`UPDATE detections SET ${setClauses} WHERE id = ?`, [...processedUpdates.map(([, v]) => v), detId])
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    await initDb()
    await requireAuth(req)
    const { detId } = await params
    await query('UPDATE detections SET deleted = 1 WHERE id = ?', [detId])
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
