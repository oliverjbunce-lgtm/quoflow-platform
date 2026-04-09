'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function PlanReviewRedirect() {
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    if (id) router.replace(`/plan/${id}`)
  }, [id, router])

  return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'3px solid #e5e7eb', borderTopColor:'#0A84FF', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
