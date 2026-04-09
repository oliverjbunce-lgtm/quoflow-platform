import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { initDb, query } from '@/lib/db'

export async function GET(req, { params }) {
  try {
    await initDb()
    const user = await requireAuth(req)
    const { id } = await params

    const quoteResult = await query(
      'SELECT * FROM quotes WHERE id = ? AND tenant_id = ?',
      [id, user.tenantId]
    )
    const quote = quoteResult.rows[0]
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const tenantResult = await query('SELECT * FROM tenants WHERE id = ?', [user.tenantId])
    const tenant = tenantResult.rows[0]

    // Dynamically import to avoid SSR issues
    const { pdf } = await import('@react-pdf/renderer')
    const { default: QuotePDFDocument } = await import('@/components/QuotePDFDocument')
    const React = await import('react')

    const element = React.createElement(QuotePDFDocument, { quote, tenant })
    const buffer = await pdf(element).toBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quote-${quote.id}.pdf"`,
      }
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate PDF' }, { status: 500 })
  }
}
