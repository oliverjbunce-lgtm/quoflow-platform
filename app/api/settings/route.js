import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function GET(req) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await query('SELECT * FROM tenants WHERE id = ?', [user.tenantId])
    const tenant = result.rows[0]
    return NextResponse.json({ tenant })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    await initDb()
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, logo_url, pricing_rules, ...settingsFields } = body

    // Get current settings
    const tenantResult = await query('SELECT * FROM tenants WHERE id = ?', [user.tenantId])
    const tenant = tenantResult.rows[0]
    if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let currentSettings = {}
    try {
      currentSettings = JSON.parse(tenant.settings_json || '{}')
    } catch {}

    // Merge settings
    const updatedSettings = {
      ...currentSettings,
      ...settingsFields,
    }
    if (pricing_rules !== undefined) {
      updatedSettings.pricing_rules = pricing_rules
    }

    const updates = []
    const values = []

    if (name !== undefined) { updates.push('name = ?'); values.push(name) }
    if (logo_url !== undefined) { updates.push('logo_url = ?'); values.push(logo_url) }
    updates.push('settings_json = ?')
    values.push(JSON.stringify(updatedSettings))
    values.push(user.tenantId)

    await query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, values)

    const updatedTenant = await query('SELECT id, name, slug, logo_url, settings_json FROM tenants WHERE id = ?', [user.tenantId])
    return NextResponse.json({ tenant: updatedTenant.rows[0] })
  } catch (err) {
    console.error('Settings PUT error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
