'use client'
import { useEffect } from 'react'

export default function PlanError({ error, reset }) {
  useEffect(() => {
    console.error('Plan review error:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, sans-serif',
      background: '#f2f2f7',
      padding: 24,
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>⚠️</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#1c1c1e' }}>
          Something went wrong loading the plan
        </h2>
        <p style={{ fontSize: 14, color: '#636366', marginBottom: 24, fontFamily: 'monospace', background: '#e5e5ea', padding: '8px 12px', borderRadius: 8 }}>
          {error?.message || 'Unknown error'}
        </p>
        <button
          onClick={reset}
          style={{ background: '#0A84FF', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 15, cursor: 'pointer', marginRight: 12 }}
        >
          Try again
        </button>
        <a href="/admin/plans" style={{ color: '#0A84FF', fontSize: 15, textDecoration: 'none' }}>
          ← Back to Plans
        </a>
      </div>
    </div>
  )
}
