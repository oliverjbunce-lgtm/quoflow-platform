import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { initDb, query } from '@/lib/db'
import { readFile } from 'fs/promises'

export async function GET(req, { params }) {
  try {
    await initDb()
    await requireAuth(req)
    const { id } = await params
    const result = await query('SELECT file_path FROM plans WHERE id = ?', [id])
    const plan = result.rows[0]
    if (!plan?.file_path) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    try {
      const bytes = await readFile(plan.file_path)
      return new NextResponse(bytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          'Cache-Control': 'private, max-age=3600',
        }
      })
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
