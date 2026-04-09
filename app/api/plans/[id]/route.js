import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function GET(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id } = await params

    const planResult = await query('SELECT * FROM plans WHERE id = ? AND tenant_id = ?', [id, user.tenantId])
    const plan = planResult.rows[0]
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Get all non-deleted detections for this plan
    const detResult = await query(`
      SELECT d.*, a.page_num
      FROM detections d
      JOIN analyses a ON d.analysis_id = a.id
      WHERE a.plan_id = ? AND (d.deleted IS NULL OR d.deleted = 0)
      ORDER BY a.page_num, d.rowid
    `, [id])

    return NextResponse.json({ plan, detections: detResult.rows })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id } = await params
    const body = await req.json()

    const allowed = ['review_status', 'notes', 'client_name', 'client_company', 'client_id']
    const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
    if (updates.length === 0) return NextResponse.json({ ok: true })

    const setClauses = updates.map(([k]) => `${k} = ?`).join(', ')
    const values = [...updates.map(([, v]) => v), id, user.tenantId]
    await query(`UPDATE plans SET ${setClauses} WHERE id = ? AND tenant_id = ?`, values)

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
