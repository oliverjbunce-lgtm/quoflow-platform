import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { initDb, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(req, { params }) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    await initDb()
    const user = await requireAdmin(req)
    const { id } = await params

    const quoteResult = await query('SELECT * FROM quotes WHERE id = ? AND tenant_id = ?', [id, user.tenantId])
    const quote = quoteResult.rows[0]
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const tenantResult = await query('SELECT * FROM tenants WHERE id = ?', [user.tenantId])
    const tenant = tenantResult.rows[0]

    const items = JSON.parse(quote.items_json || '[]')

    // Send email via Resend
    try {
      await resend.emails.send({
        from: 'Quoflow <onboarding@resend.dev>',
        to: process.env.ADMIN_EMAIL || 'oliverjbunce@gmail.com',
        subject: `Quote ${quote.id} — ${quote.client_name || 'Your Project'}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #f2f2f7; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
                <div style="background: #0A84FF; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: 900; font-size: 18px;">Q</span>
                </div>
                <div>
                  <div style="font-size: 20px; font-weight: 900; color: #1c1c1e;">Quoflow</div>
                  <div style="font-size: 12px; color: #8e8e93;">${tenant?.name || 'Building Supply Co.'}</div>
                </div>
              </div>
              <h1 style="font-size: 28px; font-weight: 900; color: #1c1c1e; margin: 0 0 8px;">Your Quote is Ready</h1>
              <p style="color: #8e8e93; margin: 0 0 32px;">Hi ${quote.client_name || 'there'},</p>
              <div style="background: #f2f2f7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                  <span style="color: #8e8e93; font-size: 13px;">Quote Number</span>
                  <span style="font-weight: 700; color: #1c1c1e;">${quote.id}</span>
                </div>
                ${items.map(item => `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #e5e5ea;">
                    <span style="color: #1c1c1e;">${item.name} × ${item.qty}</span>
                    <span style="color: #1c1c1e;">$${(item.qty * item.unit_price).toFixed(2)}</span>
                  </div>
                `).join('')}
                <div style="border-top: 2px solid #0A84FF; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between;">
                  <span style="font-weight: 900; color: #1c1c1e; font-size: 18px;">Total (incl. GST)</span>
                  <span style="font-weight: 900; color: #0A84FF; font-size: 18px;">$${Number(quote.total).toFixed(2)} NZD</span>
                </div>
              </div>
              ${quote.notes ? `<p style="color: #8e8e93; font-size: 14px; margin-bottom: 24px;">${quote.notes}</p>` : ''}
              <p style="color: #8e8e93; font-size: 13px; margin: 0;">Reply to this email to accept this quote or ask any questions.</p>
            </div>
          </div>
        `,
      })
    } catch (emailErr) {
      console.warn('Email send failed:', emailErr.message)
    }

    // Update quote status
    await query('UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?', [
      'sent', Math.floor(Date.now() / 1000), id
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err.message === 'Unauthorized' || err.message === 'Forbidden') {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
