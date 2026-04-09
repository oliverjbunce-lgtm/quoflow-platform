import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { initDb, query } from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function POST(req) {
  try {
    await initDb()
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const result = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()])
    const user = result.rows[0]

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const tenantResult = await query('SELECT * FROM tenants WHERE id = ?', [user.tenant_id])
    const tenant = tenantResult.rows[0]

    const token = await signToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
      name: user.name,
    })

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant_id: user.tenant_id },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })

    response.cookies.set('qf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
