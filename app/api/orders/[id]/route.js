import { NextResponse } from 'next/server'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PUT(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id } = await params
    const { status } = await req.json()
    await query('UPDATE orders SET status = ? WHERE id = ? AND tenant_id = ?', [status, id, user.tenantId])
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
