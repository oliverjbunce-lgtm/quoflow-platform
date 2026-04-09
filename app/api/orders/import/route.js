import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { initDb, query } from '@/lib/db'

export async function POST(req) {
  try {
    await initDb()
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.IMPORT_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { tenantId, builderEmail, data, floorPlanData } = body

    // Find builder
    let builderId = null
    if (builderEmail) {
      const userResult = await query('SELECT id FROM users WHERE email = ? AND tenant_id = ?', [builderEmail, tenantId])
      if (userResult.rows[0]) builderId = userResult.rows[0].id
    }

    const orderId = randomUUID()
    await query(
      'INSERT INTO orders (id, tenant_id, builder_id, status, data_json, floor_plan_data) VALUES (?, ?, ?, ?, ?, ?)',
      [orderId, tenantId || 'demo', builderId, 'pending', JSON.stringify(data || {}), floorPlanData || null]
    )

    return NextResponse.json({ orderId, success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
