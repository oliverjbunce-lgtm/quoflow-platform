import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function PATCH(req, { params }) {
  try {
    await initDb()
    await requireAuth(req)
    const { detId } = await params
    const body = await req.json()

    const allowed = ['corrected_class', 'specs_json', 'deleted']
    const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
    if (updates.length === 0) return NextResponse.json({ ok: true })

    // specs_json should be stored as string
    const processedUpdates = updates.map(([k, v]) => [k, k === 'specs_json' ? JSON.stringify(v) : v])
    const setClauses = processedUpdates.map(([k]) => `${k} = ?`).join(', ')
    await query(`UPDATE detections SET ${setClauses} WHERE id = ?`, [...processedUpdates.map(([, v]) => v), detId])

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
