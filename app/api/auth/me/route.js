import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function GET(req) {
  try {
    await initDb()
    const payload = await getUser(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userResult = await query('SELECT id, name, email, role, tenant_id, location FROM users WHERE id = ?', [payload.userId])
    const user = userResult.rows[0]
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const tenantResult = await query('SELECT id, name, slug, logo_url, settings_json FROM tenants WHERE id = ?', [user.tenant_id])
    const tenant = tenantResult.rows[0]

    return NextResponse.json({ user, tenant })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req) {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('qf_token')
  return response
}
