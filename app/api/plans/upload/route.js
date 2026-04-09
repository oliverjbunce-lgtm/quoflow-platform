import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { initDb, query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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
    const originalFilename = file.name || 'floor-plan.pdf'
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Store file on disk (Railway volume or local)
    const dataDir = process.env.DATA_DIR || '/data'
    const plansDir = path.join(dataDir, 'plans')
    let filePath = null
    try {
      await mkdir(plansDir, { recursive: true })
      filePath = path.join(plansDir, `${planId}.pdf`)
      await writeFile(filePath, buffer)
    } catch (err) {
      console.warn('Could not write to disk:', err.message)
    }

    await query(
      'INSERT INTO plans (id, tenant_id, uploaded_by, filename, page_count, file_path, original_filename) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [planId, user.tenantId, user.userId, originalFilename, 1, filePath, originalFilename]
    )

    return NextResponse.json({ planId, filename: originalFilename, pageCount: 1 })
  } catch (err) {
    console.error('Upload error:', err)
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
