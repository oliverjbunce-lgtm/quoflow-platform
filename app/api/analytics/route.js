import { NextResponse } from 'next/server'
import { initDb, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req) {
  try {
    await initDb()
    const user = await requireAdmin(req)

    const [analysesCount, quotesCount, ordersCount, pendingQuotes, totalValue, detectionsCount] = await Promise.all([
      query('SELECT COUNT(*) as c FROM analyses WHERE tenant_id = ?', [user.tenantId]),
      query('SELECT COUNT(*) as c FROM quotes WHERE tenant_id = ?', [user.tenantId]),
      query('SELECT COUNT(*) as c FROM orders WHERE tenant_id = ?', [user.tenantId]),
      query('SELECT COUNT(*) as c FROM quotes WHERE tenant_id = ? AND status = ?', [user.tenantId, 'pending']),
      query('SELECT COALESCE(AVG(total), 0) as avg FROM quotes WHERE tenant_id = ? AND status IN (?,?,?)', [user.tenantId, 'sent', 'accepted', 'draft']),
      query('SELECT COUNT(*) as c FROM detections d JOIN analyses a ON d.analysis_id = a.id WHERE a.tenant_id = ?', [user.tenantId]),
    ])

    // Monthly data for charts
    const monthlyAnalyses = await query(
      `SELECT strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month, COUNT(*) as count
       FROM analyses WHERE tenant_id = ?
       GROUP BY month ORDER BY month DESC LIMIT 6`,
      [user.tenantId]
    )

    const monthlyRevenue = await query(
      `SELECT strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month, SUM(total) as revenue
       FROM quotes WHERE tenant_id = ? AND status IN ('sent', 'accepted')
       GROUP BY month ORDER BY month DESC LIMIT 6`,
      [user.tenantId]
    )

    const detectionBreakdown = await query(
      `SELECT class_name, COUNT(*) as count
       FROM detections d JOIN analyses a ON d.analysis_id = a.id
       WHERE a.tenant_id = ?
       GROUP BY class_name ORDER BY count DESC LIMIT 10`,
      [user.tenantId]
    )

    const acceptedCount = await query(
      'SELECT COUNT(*) as c FROM quotes WHERE tenant_id = ? AND status = ?',
      [user.tenantId, 'accepted']
    )

    const totalQuotes = Number(quotesCount.rows[0].c) || 1
    const winRate = Math.round((Number(acceptedCount.rows[0].c) / totalQuotes) * 100)

    return NextResponse.json({
      stats: {
        analysesCount: Number(analysesCount.rows[0].c),
        quotesCount: Number(quotesCount.rows[0].c),
        ordersCount: Number(ordersCount.rows[0].c),
        pendingQuotes: Number(pendingQuotes.rows[0].c),
        avgQuoteValue: Number(totalValue.rows[0].avg).toFixed(0),
        detectionsCount: Number(detectionsCount.rows[0].c),
        winRate,
      },
      monthlyAnalyses: monthlyAnalyses.rows,
      monthlyRevenue: monthlyRevenue.rows,
      detectionBreakdown: detectionBreakdown.rows,
    })
  } catch (err) {
    console.error('Analytics error:', err)
    if (err.message === 'Unauthorized' || err.message === 'Forbidden') {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
