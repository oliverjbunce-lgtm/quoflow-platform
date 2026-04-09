import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { initDb, query } from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function POST(req) {
  try {
    await initDb()
    const { token, name, email, password } = await req.json()

    if (!token || !name || !email || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    // Validate invite token
    const inviteResult = await query(
      'SELECT * FROM invites WHERE token = ? AND claimed = 0',
      [token]
    )
    const invite = inviteResult.rows[0]
    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 400 })
    }

    // Check email not taken
    const existingResult = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()])
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 10)
    const userId = randomUUID()

    await query(
      'INSERT INTO users (id, tenant_id, role, email, name, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, invite.tenant_id, invite.role || 'builder', email.toLowerCase(), name, hash]
    )

    // Mark invite as claimed
    await query('UPDATE invites SET claimed = 1 WHERE id = ?', [invite.id])

    const jwtToken = await signToken({
      userId,
      tenantId: invite.tenant_id,
      role: invite.role || 'builder',
      email: email.toLowerCase(),
      name,
    })

    const response = NextResponse.json({ success: true, user: { id: userId, name, email, role: invite.role || 'builder' } })
    response.cookies.set('qf_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
