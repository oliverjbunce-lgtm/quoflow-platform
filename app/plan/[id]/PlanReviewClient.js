'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, ChevronRight, CheckCircle, Plus } from 'lucide-react'

import { getColour } from './components/constants'
import DetectionCard from './components/DetectionCard'
import AddDetectionModal from './components/AddDetectionModal'
import ClientModal from './components/ClientModal'

export default function PlanReviewClient() {
  const { id: planId } = useParams()
  const router = useRouter()

  const [plan, setPlan] = useState(null)
  const [detections, setDetections] = useState([])
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDetId, setSelectedDetId] = useState(null)
  const [generateLoading, setGenerateLoading] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [clients, setClients] = useState([])

  // Draw mode state
  const [drawMode, setDrawMode] = useState(false)
  const [drawRect, setDrawRect] = useState(null)
  const [drawStart, setDrawStart] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [pendingBbox, setPendingBbox] = useState(null)

  // Pan/zoom state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [showZoomIndicator, setShowZoomIndicator] = useState(false)

  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const panStart = useRef(null)
  const lastTouchDist = useRef(null)
  const zoomIndicatorTimer = useRef(null)
  const saveTimers = useRef({})

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!planId) return
    fetch(`/api/plans/${planId}`)
      .then((r) => r.json())
      .then((d) => {
        setPlan(d.plan)
        setDetections(
          (d.detections || []).map((det) => ({
            ...det,
            specs: (() => {
              try { return JSON.parse(det.specs_json || '{}') } catch { return {} }
            })(),
            bbox: (() => {
              try { return JSON.parse(det.bbox_json || 'null') } catch { return null }
            })(),
          }))
        )
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [planId])

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.clients || []))
  }, [])

  // ── PDF rendering ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!planId) return
    async function loadPDF() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
        const url = `/api/plans/${planId}/file`
        const pdf = await pdfjsLib.getDocument(url).promise
        const rendered = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          rendered.push({ pageNum: i, dataUrl: canvas.toDataURL('image/jpeg', 0.9) })
        }
        setPages(rendered)
      } catch (err) {
        console.error('PDF load error:', err)
      }
    }
    loadPDF()
  }, [planId])

  // ── Detection mutations ───────────────────────────────────────────────────
  // Defined BEFORE any useEffect that references them to avoid TDZ errors.

  const updateDetection = useCallback(
    (detId, changes) => {
      setDetections((prev) =>
        prev.map((d) => (d.id === detId ? { ...d, ...changes } : d))
      )
      if (saveTimers.current[detId]) clearTimeout(saveTimers.current[detId])
      saveTimers.current[detId] = setTimeout(async () => {
        const payload = {}
        if (changes.corrected_class !== undefined) payload.corrected_class = changes.corrected_class
        if (changes.specs !== undefined) payload.specs_json = changes.specs
        if (changes.deleted !== undefined) payload.deleted = changes.deleted ? 1 : 0
        if (Object.keys(payload).length > 0) {
          await fetch(`/api/plans/${planId}/detections/${detId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        }
      }, 500)
    },
    [planId]
  )

  const deleteDetection = useCallback(
    (detId) => {
      setDetections((prev) => prev.filter((d) => d.id !== detId))
      fetch(`/api/plans/${planId}/detections/${detId}`, { method: 'DELETE' })
    },
    [planId]
  )

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // Placed AFTER deleteDetection to avoid TDZ.

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDetId) {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
        deleteDetection(selectedDetId)
        setSelectedDetId(null)
        return
      }
      if (e.key === 'Escape') {
        setDrawMode(false)
        setDrawRect(null)
        setDrawStart(null)
        setSelectedDetId(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedDetId, deleteDetection])

  // ── Canvas drawing ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !pages.length) return
    const img = imageRef.current
    const canvas = canvasRef.current

    const draw = () => {
      const naturalW = img.naturalWidth || 1
      const naturalH = img.naturalHeight || 1
      const elementW = img.clientWidth
      const elementH = img.clientHeight
      if (!elementW || !elementH) return

      // object-contain: compute actual rendered content size
      const naturalAspect = naturalW / naturalH
      const elementAspect = elementW / elementH
      let contentW, contentH
      if (naturalAspect > elementAspect) {
        contentW = elementW
        contentH = elementW / naturalAspect
      } else {
        contentH = elementH
        contentW = elementH * naturalAspect
      }

      canvas.width = contentW
      canvas.height = contentH
      canvas.style.width = contentW + 'px'
      canvas.style.height = contentH + 'px'
      canvas.style.left = (elementW - contentW) / 2 + 'px'
      canvas.style.top = (elementH - contentH) / 2 + 'px'

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, contentW, contentH)

      // Polyfill roundRect for older browsers
      if (!ctx.roundRect) {
        ctx.roundRect = function (x, y, w, h, r) {
          const rad = Array.isArray(r) ? r[0] : r || 0
          ctx.beginPath()
          ctx.moveTo(x + rad, y)
          ctx.lineTo(x + w - rad, y)
          ctx.quadraticCurveTo(x + w, y, x + w, y + rad)
          ctx.lineTo(x + w, y + h - rad)
          ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h)
          ctx.lineTo(x + rad, y + h)
          ctx.quadraticCurveTo(x, y + h, x, y + h - rad)
          ctx.lineTo(x, y + rad)
          ctx.quadraticCurveTo(x, y, x + rad, y)
          ctx.closePath()
        }
      }

      const scaleX = contentW / naturalW
      const scaleY = contentH / naturalH
      const pageDetections = detections.filter((d) => (d.page_num || 1) === currentPage)

      pageDetections.forEach((det) => {
        const rawBbox = det.bbox
        if (!rawBbox) return
        let x1, y1, x2, y2
        if (Array.isArray(rawBbox)) {
          ;[x1, y1, x2, y2] = rawBbox
        } else if (typeof rawBbox === 'object') {
          x1 = rawBbox.x1; y1 = rawBbox.y1; x2 = rawBbox.x2; y2 = rawBbox.y2
        } else {
          return
        }
        if (x1 == null) return

        // Normalised 0-1 → natural image pixel space
        if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
          x1 *= naturalW; y1 *= naturalH; x2 *= naturalW; y2 *= naturalH
        }

        const sx1 = x1 * scaleX
        const sy1 = y1 * scaleY
        const sw = (x2 - x1) * scaleX
        const sh = (y2 - y1) * scaleY
        if (sw <= 0 || sh <= 0) return

        const color = getColour(det.corrected_class || det.class_name)
        const isSelected = det.id === selectedDetId

        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.strokeRect(sx1, sy1, sw, sh)

        if (isSelected) {
          ctx.fillStyle = color + '20'
          ctx.fillRect(sx1, sy1, sw, sh)
        }

        const label = (det.corrected_class || det.class_name || '').replace(/_/g, ' ')
        ctx.font = 'bold 11px Inter, -apple-system, sans-serif'
        const textW = ctx.measureText(label).width + 8
        ctx.fillStyle = color
        const labelY = sy1 < 22 ? sy1 : sy1 - 20
        const labelRadius = sy1 < 22 ? [4, 0, 4, 0] : [4, 4, 0, 0]
        ctx.beginPath()
        ctx.roundRect(sx1, labelY, textW, 20, labelRadius)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillText(label, sx1 + 4, labelY + 14)
      })

      // In-progress draw rectangle
      if (drawRect) {
        const { x1, y1, x2, y2 } = drawRect
        ctx.strokeStyle = '#0A84FF'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(
          Math.min(x1, x2), Math.min(y1, y2),
          Math.abs(x2 - x1), Math.abs(y2 - y1)
        )
        ctx.fillStyle = 'rgba(10, 132, 255, 0.08)'
        ctx.fillRect(
          Math.min(x1, x2), Math.min(y1, y2),
          Math.abs(x2 - x1), Math.abs(y2 - y1)
        )
        ctx.setLineDash([])
      }
    }

    if (img.complete && img.naturalWidth > 0) draw()
    else img.onload = draw
    const ro = new ResizeObserver(draw)
    ro.observe(img)
    return () => ro.disconnect()
  }, [detections, currentPage, pages, selectedDetId, drawRect])

  // ── Pan/zoom handlers ─────────────────────────────────────────────────────

  const showZoom = useCallback(() => {
    setShowZoomIndicator(true)
    if (zoomIndicatorTimer.current) clearTimeout(zoomIndicatorTimer.current)
    zoomIndicatorTimer.current = setTimeout(() => setShowZoomIndicator(false), 1500)
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(5, Math.max(0.5, z * delta)))
    showZoom()
  }, [showZoom])

  const handlePanMouseDown = useCallback((e) => {
    if (drawMode) return
    setIsPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }, [drawMode, pan])

  const handlePanMouseMove = useCallback((e) => {
    if (!isPanning || drawMode) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }, [isPanning, drawMode])

  const handlePanMouseUp = useCallback(() => setIsPanning(false), [])

  const handleDoubleClick = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    showZoom()
  }, [showZoom])

  // Touch pinch/pan
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.hypot(dx, dy)
    } else if (e.touches.length === 1 && !drawMode) {
      setIsPanning(true)
      panStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }
    }
  }, [drawMode, pan])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && lastTouchDist.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const scale = dist / lastTouchDist.current
      setZoom(z => Math.min(5, Math.max(0.5, z * scale)))
      lastTouchDist.current = dist
      showZoom()
    } else if (e.touches.length === 1 && isPanning && !drawMode) {
      setPan({ x: e.touches[0].clientX - panStart.current.x, y: e.touches[0].clientY - panStart.current.y })
    }
  }, [isPanning, drawMode, showZoom])

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null
    setIsPanning(false)
  }, [])

  // ── Canvas mouse handlers ─────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback(
    (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      // Account for CSS scale transform: convert visual coords → canvas pixel coords
      const x = (e.clientX - rect.left) * (canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (canvas.height / rect.height)

      if (drawMode) {
        setDrawStart({ x, y })
        setDrawRect({ x1: x, y1: y, x2: x, y2: y })
      } else {
        // Click-to-select: find smallest bbox containing the click point
        const normX = x / canvas.width
        const normY = y / canvas.height
        const pageDetections = detections.filter((d) => (d.page_num || 1) === currentPage)

        let found = null
        let minArea = Infinity
        for (const det of pageDetections) {
          const bbox = det.bbox
          if (!bbox) continue
          const [bx1, by1, bx2, by2] = Array.isArray(bbox)
            ? bbox
            : [bbox.x1, bbox.y1, bbox.x2, bbox.y2]
          if (normX >= bx1 && normX <= bx2 && normY >= by1 && normY <= by2) {
            const area = (bx2 - bx1) * (by2 - by1)
            if (area < minArea) { minArea = area; found = det }
          }
        }
        if (found) setSelectedDetId(found.id)
      }
    },
    [drawMode, detections, currentPage]
  )

  const handleCanvasMouseMove = useCallback(
    (e) => {
      if (!drawMode || !drawStart) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (canvas.height / rect.height)
      setDrawRect({ x1: drawStart.x, y1: drawStart.y, x2: x, y2: y })
    },
    [drawMode, drawStart]
  )

  const handleCanvasMouseUp = useCallback(
    (e) => {
      if (!drawMode || !drawStart) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (canvas.height / rect.height)

      const pixX1 = Math.min(drawStart.x, x)
      const pixY1 = Math.min(drawStart.y, y)
      const pixX2 = Math.max(drawStart.x, x)
      const pixY2 = Math.max(drawStart.y, y)

      // Too small = accidental click
      if (pixX2 - pixX1 < 8 || pixY2 - pixY1 < 8) {
        setDrawStart(null)
        setDrawRect(null)
        return
      }

      // Normalise to 0-1
      const normBbox = [
        pixX1 / canvas.width,
        pixY1 / canvas.height,
        pixX2 / canvas.width,
        pixY2 / canvas.height,
      ]

      setDrawStart(null)
      setDrawRect(null)
      setPendingBbox(normBbox)
      setShowAddModal(true)
    },
    [drawMode, drawStart]
  )

  // ── API actions ───────────────────────────────────────────────────────────

  const handleAddDetection = useCallback(
    async (type) => {
      if (!pendingBbox) return
      const res = await fetch(`/api/plans/${planId}/detections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_name: type,
          bbox: pendingBbox,
          page_num: currentPage,
        }),
      })
      const data = await res.json()
      setDetections((prev) => [
        ...prev,
        {
          id: data.id,
          class_name: type,
          confidence: 1.0,
          bbox: pendingBbox,
          page_num: currentPage,
          specs: {},
        },
      ])
      setShowAddModal(false)
      setPendingBbox(null)
      setDrawMode(false)
    },
    [planId, pendingBbox, currentPage]
  )

  const handleAssignClient = useCallback(
    async (client) => {
      await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          client_name: client.name,
          client_company: client.company,
        }),
      })
      setPlan((p) => ({ ...p, client_name: client.name, client_company: client.company }))
      setShowClientModal(false)
    },
    [planId]
  )

  const handleAddNewClient = useCallback(
    async ({ name, company }) => {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company }),
      })
      const data = await res.json()
      await handleAssignClient({ id: data.id, name, company })
    },
    [handleAssignClient]
  )

  const generateQuote = async () => {
    setGenerateLoading(true)
    const res = await fetch(`/api/plans/${planId}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: plan?.client_name }),
    })
    const data = await res.json()
    setGenerateLoading(false)
    if (data.quoteId) router.push(`/admin/quotes/${data.quoteId}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f2f2f7] dark:bg-[#1c1c1e]">
        <div className="w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f2f2f7] dark:bg-[#1c1c1e] flex-col gap-4">
        <p className="text-lg font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">Plan not found</p>
        <button
          onClick={() => router.push('/admin/plans')}
          className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0070d6] transition-colors"
        >
          Back to Plans
        </button>
      </div>
    )
  }

  const currentPageData = pages.find((p) => p.pageNum === currentPage)
  const pageDetections = detections.filter((d) => (d.page_num || 1) === currentPage)
  const totalDetections = detections.length

  return (
    <div className="flex h-screen overflow-hidden bg-[#f2f2f7] dark:bg-[#1c1c1e]">

      {/* LEFT: PDF Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-white/10">
          <button
            onClick={() => router.push('/admin/plans')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0A84FF] transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} /> Plans
          </button>
          <span className="text-gray-300 dark:text-white/20">/</span>
          <h1 className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate flex-1">
            {plan?.original_filename || plan?.filename || planId}
          </h1>
          {plan?.client_name ? (
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
              {plan.client_name}
            </span>
          ) : (
            <button
              onClick={() => setShowClientModal(true)}
              className="text-xs text-[#0A84FF] bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Assign Client
            </button>
          )}
        </div>

        {/* PDF main view — pan/zoom container */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden w-full bg-gray-100 dark:bg-zinc-800/50"
          onWheel={handleWheel}
          onMouseDown={handlePanMouseDown}
          onMouseMove={handlePanMouseMove}
          onMouseUp={handlePanMouseUp}
          onMouseLeave={handlePanMouseUp}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: drawMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab' }}
        >
          {currentPageData ? (
            <>
              {/* Transform wrapper — image + canvas scale together */}
              <div
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: '0 0',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}
              >
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    ref={imageRef}
                    src={currentPageData.dataUrl}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
                    style={{ maxHeight: 'calc(100vh - 160px)', display: 'block' }}
                    alt={`Page ${currentPage}`}
                    draggable={false}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute rounded-xl"
                    style={{ cursor: drawMode ? 'crosshair' : 'default', pointerEvents: drawMode ? 'auto' : 'auto' }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                  />
                </div>
              </div>

              {/* Draw mode banner — outside transform so it stays fixed */}
              {drawMode && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                  <div className="px-4 py-2 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-lg border border-[#0A84FF]/30 text-sm font-medium text-[#0A84FF] whitespace-nowrap backdrop-blur-sm">
                    ✦ Click and drag to draw a detection box — press Esc to cancel
                  </div>
                </div>
              )}

              {/* Zoom indicator */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontSize: 12,
                  pointerEvents: 'none',
                  transition: 'opacity 0.3s',
                  opacity: showZoomIndicator ? 1 : 0,
                  zIndex: 10,
                }}
              >
                {Math.round(zoom * 100)}%
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-[#0A84FF] rounded-full animate-spin" />
              <p className="text-sm">Loading PDF…</p>
            </div>
          )}
        </div>

        {/* Page filmstrip */}
        {pages.length > 1 && (
          <div className="flex gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-white/10 overflow-x-auto">
            {pages.map((page) => (
              <button
                key={page.pageNum}
                onClick={() => setCurrentPage(page.pageNum)}
                className={`flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  page.pageNum === currentPage
                    ? 'border-[#0A84FF] shadow-md'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-400'
                }`}
              >
                <img
                  src={page.dataUrl}
                  className="w-full h-full object-cover"
                  alt={`Page ${page.pageNum}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Detection Editor */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-white/10">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Detections</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 tabular-nums">{totalDetections} total</span>
              <button
                onClick={() => setDrawMode((d) => !d)}
                title={drawMode ? 'Cancel draw' : 'Draw detection box'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  drawMode
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-[#0A84FF] text-white hover:bg-[#0070d6]'
                }`}
              >
                <Plus size={15} strokeWidth={2} />
                {drawMode ? 'Cancel' : 'Add Detection'}
              </button>
            </div>
          </div>
          {pages.length > 1 && (
            <p className="text-xs text-gray-400">
              Showing page {currentPage} of {pages.length} — {pageDetections.length} on this page
            </p>
          )}
        </div>

        {/* Detection list */}
        <div className="flex-1 overflow-y-auto">
          {detections.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400">No detections found</div>
          )}

          {pages.length > 1 && detections.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Page {currentPage}
              </p>
            </div>
          )}

          {drawMode && (
            <div className="mx-3 mb-2 mt-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-[#0A84FF]/30 text-xs text-[#0A84FF] font-medium">
              Draw mode — drag a box on the floor plan
            </div>
          )}

          {pageDetections.map((det) => (
            <DetectionCard
              key={det.id}
              det={det}
              isSelected={det.id === selectedDetId}
              onClick={() => setSelectedDetId(det.id === selectedDetId ? null : det.id)}
              onUpdate={(changes) => updateDetection(det.id, changes)}
              onDelete={() => deleteDetection(det.id)}
            />
          ))}

          {pages.length > 1 &&
            detections.filter((d) => (d.page_num || 1) !== currentPage).length > 0 && (
              <div className="px-4 pt-4 pb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Other pages
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {detections.filter((d) => (d.page_num || 1) !== currentPage).length} components
                  on other pages
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>{totalDetections} components ready</span>
          </div>
          <button
            onClick={generateQuote}
            disabled={generateLoading || totalDetections === 0}
            className="w-full py-3 rounded-xl bg-[#0A84FF] text-white font-semibold text-sm hover:bg-[#0070d6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generateLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={16} strokeWidth={1.5} />
                Generate Quote
              </>
            )}
          </button>
        </div>
      </div>

      {/* Client modal */}
      {showClientModal && (
        <ClientModal
          clients={clients}
          onAssign={handleAssignClient}
          onAddNew={handleAddNewClient}
          onClose={() => setShowClientModal(false)}
        />
      )}

      {/* Add detection modal */}
      {showAddModal && (
        <AddDetectionModal
          position={pendingBbox}
          onAdd={handleAddDetection}
          onClose={() => {
            setShowAddModal(false)
            setPendingBbox(null)
          }}
        />
      )}
    </div>
  )
}
