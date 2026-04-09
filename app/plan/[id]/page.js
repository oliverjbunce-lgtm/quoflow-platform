'use client'
import dynamic from 'next/dynamic'

const PlanReview = dynamic(
  () => import('./PlanReviewClient'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f2f2f7',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #e5e7eb',
          borderTopColor: '#0A84FF',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    ),
  }
)

export default function PlanReviewPage() {
  return <PlanReview />
}
