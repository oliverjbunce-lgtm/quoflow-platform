import { NextResponse } from 'next/server'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id } = await params

    const result = await query('SELECT * FROM quotes WHERE id = ? AND tenant_id = ?', [id, user.tenantId])
    if (!result.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const quote = result.rows[0]
    if (quote.items_json) quote.items = JSON.parse(quote.items_json)

    // Get analysis if exists
    if (quote.analysis_id) {
      const analysisResult = await query('SELECT * FROM analyses WHERE id = ?', [quote.analysis_id])
      if (analysisResult.rows[0]) {
        quote.analysis = analysisResult.rows[0]
        const detectionsResult = await query('SELECT * FROM detections WHERE analysis_id = ?', [quote.analysis_id])
        quote.detections = detectionsResult.rows.map(d => ({ ...d, bbox: JSON.parse(d.bbox_json || '{}') }))
      }
    }

    return NextResponse.json({ quote })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id } = await params
    const body = await req.json()

    const { status, clientName, items, notes } = body

    const updates = []
    const args = []

    if (status !== undefined) { updates.push('status = ?'); args.push(status) }
    if (clientName !== undefined) { updates.push('client_name = ?'); args.push(clientName) }
    if (notes !== undefined) { updates.push('notes = ?'); args.push(notes) }
    if (items !== undefined) {
      const subtotal = items.reduce((s, item) => s + (item.qty * item.unit_price), 0)
      const gst = subtotal * 0.15
      const total = subtotal + gst
      updates.push('items_json = ?', 'subtotal = ?', 'gst = ?', 'total = ?')
      args.push(JSON.stringify(items), subtotal, gst, total)
    }

    updates.push('updated_at = ?')
    args.push(Math.floor(Date.now() / 1000))
    args.push(id, user.tenantId)

    await query(
      `UPDATE quotes SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      args
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id } = await params

    await query('DELETE FROM quotes WHERE id = ? AND tenant_id = ?', [id, user.tenantId])
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
