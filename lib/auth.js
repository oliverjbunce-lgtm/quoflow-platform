import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'qf-jwt-secret-xK9mPqR4nLm9vTw4jYd8sHu3'
)

export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

export async function getUser(req) {
  try {
    let token
    if (req) {
      token = req.cookies.get?.('qf_token')?.value || 
              req.headers.get?.('cookie')?.match(/qf_token=([^;]+)/)?.[1]
    } else {
      const cookieStore = await cookies()
      token = cookieStore.get('qf_token')?.value
    }
    if (!token) return null
    const payload = await verifyToken(token)
    return payload
  } catch {
    return null
  }
}

export async function requireAuth(req) {
  const user = await getUser(req)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin(req) {
  const user = await getUser(req)
  if (!user || !['admin', 'staff'].includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}
