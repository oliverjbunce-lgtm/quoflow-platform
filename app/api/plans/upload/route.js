import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req) {
  try {
    await initDb()
    const user = await requireAuth(req)

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const planId = randomUUID()
    const filename = file.name || 'floor-plan.pdf'
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Store file on disk (Railway volume or local)
    const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data', 'plans')
    try {
      await mkdir(dataDir, { recursive: true })
      await writeFile(join(dataDir, `${planId}.pdf`), buffer)
    } catch (err) {
      console.warn('Could not write to disk, storing metadata only:', err.message)
    }

    await query(
      'INSERT INTO plans (id, tenant_id, uploaded_by, filename, page_count) VALUES (?, ?, ?, ?, ?)',
      [planId, user.tenantId, user.userId, filename, 1]
    )

    return NextResponse.json({ planId, filename, pageCount: 1 })
  } catch (err) {
    console.error('Upload error:', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
