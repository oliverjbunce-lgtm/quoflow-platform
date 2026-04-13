'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ScanLine, Trash2 } from 'lucide-react'
import { DETECTION_LABELS, DEFAULT_UNIT_PRICES } from '@/lib/mockData'

const DETECTION_COLOURS = {
  L_prehung_door: '#0A84FF',
  R_prehung_door: '#0A84FF',
  Double_prehung_door: '#FF9F0A',
  S_cavity_slider: '#30D158',
  Double_cavity_slider: '#30D158',
  Bi_folding_door: '#BF5AF2',
  Double_bifold_door: '#BF5AF2',
  Wardrobe_sliding_two_doors_1: '#FF375F',
  Wardrobe_sliding_three_doors: '#FF375F',
  Barn_wall_slider: '#64D2FF',
  Exterior_door: '#FF6B00',
  Other: '#8E8E93',
}

const STATES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SELECTING: 'selecting',
  SCANNING: 'scanning',
  REVIEWING: 'reviewing',
  ERROR: 'error',
  DONE: 'done',
}

const SCAN_STATUS_PHASES = [
  { afterSeconds: 0,  message: 'Uploading floor plan to AI model…' },
  { afterSeconds: 3,  message: 'Rendering PDF page for analysis…' },
  { afterSeconds: 15, message: 'Running door detection… this typically takes 20–60 seconds' },
]

function normalise(name) {
  return DETECTION_LABELS[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getColour(name) {
  return DETECTION_COLOURS[name] || '#0A84FF'
}

function getUnitPrice(name) {
  return DEFAULT_UNIT_PRICES[normalise(name)] || 285
}

// ─── DetectionsTab ────────────────────────────────────────────────────────────
const DOOR_TYPES = [
  'L_prehung_door', 'R_prehung_door', 'Double_prehung_door',
  'S_cavity_slider', 'Double_cavity_slider', 'Bi_folding_door',
  'Double_bifold_door', 'Wardrobe_sliding_two_doors_1',
  'Wardrobe_sliding_three_doors', 'Barn_wall_slider',
  'Exterior_door', 'Other',
]

function DetectionsTab({ detections, setDetections }) {
  const [expandedId, setExpandedId] = useState(null)

  const update = (i, changes) => {
    const updated = [...detections]
    const specs = changes.specs ? { ...(updated[i].specs || {}), ...changes.specs } : undefined
    updated[i] = { ...updated[i], ...changes, ...(specs ? { specs } : {}) }
    setDetections(updated)
  }
  const remove = (i) => setDetections(detections.filter((_, j) => j !== i))

  if (detections.length === 0) {
    return <div className="py-16 text-center text-sm text-gray-400">No detections yet</div>
  }

  return (
    <div className="p-3 space-y-2">
      {detections.map((det, i) => {
        const color = getColour(det.corrected_class || det.class_name)
        const isExpanded = expandedId === i
        const specs = det.specs || {}

        return (
          <div key={i} className={`rounded-xl border transition-all ${isExpanded ? 'border-[#0A84FF] bg-blue-50/50 dark:bg-blue-950/20 shadow-md' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/50 hover:border-gray-300'}`}>
            <div className="flex items-center gap-2.5 p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : i)}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">{(det.corrected_class || det.class_name || '').replace(/_/g, ' ')}</p>
                {det.confidence != null && <p className="text-xs text-gray-400">{Math.round(det.confidence * 100)}% confidence</p>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 dark:border-white/5 p-3 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Door Type</label>
                  <select
                    value={det.corrected_class || det.class_name || ''}
                    onChange={e => update(i, { corrected_class: e.target.value })}
                    className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7]"
                  >
                    {DOOR_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Location</label>
                  <div className="flex gap-2">
                    {['Interior', 'Exterior'].map(loc => (
                      <button key={loc} onClick={() => update(i, { specs: { location: loc } })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${(specs.location || 'Interior') === loc ? 'bg-[#0A84FF] text-white' : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Width (mm)', 'width_mm', ['600','700','760','810','860','910']],
                    ['Height (mm)', 'height_mm', ['2040','2100']],
                    ['Core', 'core', ['Hollow Core','Solid Core','Fire Rated (FD30)']],
                    ['Finish', 'finish', ['Raw','Primed','Pre-finished White']],
                    ['Frame', 'frame', ["LJ&P Standard",'Rebate Only','No Frame']],
                    ['Handing', 'handing', ['Left Hand','Right Hand','N/A']],
                  ].map(([label, field, options]) => (
                    <div key={field}>
                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                      <select value={specs[field] || ''} onChange={e => update(i, { specs: { [field]: e.target.value } })}
                        className="w-full text-xs border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800">
                        <option value="">— select —</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <button onClick={() => { remove(i); setExpandedId(null) }}
                  className="w-full py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                  Remove detection
                </button>
              </div>
            )}
          </div>
        )
      })}
      <div className="pt-2 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500">{detections.length} components detected</div>
    </div>
  )
}
// ─── NotesTab ─────────────────────────────────────────────────────────────────
function NotesTab({ notes, setNotes }) {
  return (
    <div className="p-4">
      <label className="text-xs font-semibold tracking-wide uppercase text-gray-400 block mb-2">Internal Notes</label>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes visible to staff only…"
        rows={8}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none resize-none"
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalysisOverlay({ onClose }) {
  const [state, setState] = useState(STATES.IDLE)
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState([])
  const [selectedPage, setSelectedPage] = useState(null)
  const [previewPage, setPreviewPage] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [planId, setPlanId] = useState(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [detections, setDetections] = useState([])
  const [scanImage, setScanImage] = useState(null)
  const [reviewingPage, setReviewingPage] = useState(null)
  const [analysisId, setAnalysisId] = useState(null)
  const [notes, setNotes] = useState('')
  const [activeTab, setActiveTab] = useState('Detections')
  const [scanTime, setScanTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)

  // Pan/zoom state (for SELECTING preview)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 })
  const [isPreviewPanning, setIsPreviewPanning] = useState(false)
  const previewPanStart = useRef(null)
  const previewContainerRef = useRef(null)

  // Pan/zoom state (for REVIEWING)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [showZoomIndicator, setShowZoomIndicator] = useState(false)

  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const reviewContainerRef = useRef(null)
  const panStart = useRef(null)
  const lastTouchDist = useRef(null)
  const zoomIndicatorTimer = useRef(null)
  const router = useRouter()

  // ─── PDF rendering ───────────────────────────────────────────────────────
  async function renderPDFPages(arrayBuffer) {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const pageImages = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        pageImages.push({ pageNum: i, thumbnail: canvas.toDataURL('image/jpeg', 0.8), dataUrl: canvas.toDataURL('image/jpeg', 0.8) })
      }
      return pageImages
    } catch (err) {
      console.error('PDF render error:', err)
      return [{ pageNum: 1, thumbnail: null, dataUrl: null }]
    }
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    const f = acceptedFiles[0]
    if (!f) return
    setFile(f)
    setState(STATES.UPLOADING)
    setUploadProgress(0)

    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 15, 90))
    }, 200)

    try {
      const ab = await f.arrayBuffer()
      const pagesPromise = renderPDFPages(ab.slice(0))

      const formData = new FormData()
      formData.append('file', f)
      const uploadRes = await fetch('/api/plans/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      clearInterval(progressInterval)
      setUploadProgress(100)
      setPlanId(uploadData.planId)

      const renderedPages = await pagesPromise
      setPages(renderedPages)
      setPreviewPage(renderedPages[0])
      setSelectedPage(renderedPages[0]?.pageNum || 1)

      setTimeout(() => setState(STATES.SELECTING), 300)
    } catch (err) {
      clearInterval(progressInterval)
      console.error('Upload failed:', err)
      setState(STATES.IDLE)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  // ─── Analysis ────────────────────────────────────────────────────────────
  async function startAnalysis() {
    if (!selectedPage) return
    setState(STATES.SCANNING)
    setScanProgress(0)
    const startTime = Date.now()

    const pageData = pages.find(p => p.pageNum === selectedPage)
    setScanImage(pageData?.thumbnail || null)
    setReviewingPage(pageData || null)

    const scanInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      setScanProgress(p => {
        if (p >= 85) return p
        return p + (85 - p) * 0.03
      })
      setScanTime(Math.round(elapsed * 10) / 10)
    }, 100)

    try {
      const res = await fetch(`/api/plans/${planId}/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNums: [selectedPage],
          imageBase64: pageData?.thumbnail || '',
        }),
      })
      clearInterval(scanInterval)

      if (!res.ok) {
        console.error('Analysis API returned error:', res.status)
        setState(STATES.ERROR)
        return
      }

      const data = await res.json()
      const dets = data.detections || []
      const flatDets = dets.map(d => ({
        ...d,
        qty: 1,
        unit_price: getUnitPrice(d.class_name),
      }))
      setDetections(flatDets)
      setAnalysisId(data.analysisId)
      setScanProgress(100)
      setTimeout(() => setState(STATES.REVIEWING), 600)
    } catch (err) {
      clearInterval(scanInterval)
      console.error('Analysis failed:', err)
      setState(STATES.ERROR)
    }
  }

  // ─── Save to Plans ────────────────────────────────────────────────────────
  async function handleSaveToPlan() {
    if (!planId) return
    setSavingPlan(true)
    try {
      await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: 'in_review' }),
      })
    } catch (e) {
      console.error('Save to plans patch failed:', e)
    }
    setSavingPlan(false)
    onClose()
    window.location.href = `/plan/${planId}`
  }

  // ─── Pan/zoom handlers ────────────────────────────────────────────────────
  const showZoomBadge = useCallback(() => {
    setShowZoomIndicator(true)
    if (zoomIndicatorTimer.current) clearTimeout(zoomIndicatorTimer.current)
    zoomIndicatorTimer.current = setTimeout(() => setShowZoomIndicator(false), 1500)
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(5, Math.max(0.5, z * delta)))
    showZoomBadge()
  }, [showZoomBadge])

  const handlePanMouseDown = useCallback((e) => {
    setIsPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }, [pan])

  const handlePanMouseMove = useCallback((e) => {
    if (!isPanning) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }, [isPanning])

  const handlePanMouseUp = useCallback(() => setIsPanning(false), [])

  const handleDoubleClick = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    showZoomBadge()
  }, [showZoomBadge])

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.hypot(dx, dy)
    } else if (e.touches.length === 1) {
      setIsPanning(true)
      panStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }
    }
  }, [pan])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && lastTouchDist.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      setZoom(z => Math.min(5, Math.max(0.5, z * (dist / lastTouchDist.current))))
      lastTouchDist.current = dist
      showZoomBadge()
    } else if (e.touches.length === 1 && isPanning) {
      setPan({ x: e.touches[0].clientX - panStart.current.x, y: e.touches[0].clientY - panStart.current.y })
    }
  }, [isPanning, showZoomBadge])

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null
    setIsPanning(false)
  }, [])

  // Reset zoom when entering review state
  useEffect(() => {
    if (state === STATES.REVIEWING) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [state])

  // ─── Canvas drawing ───────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== STATES.REVIEWING) return
    if (!canvasRef.current || !imageRef.current || !detections || detections.length === 0) return

    const canvas = canvasRef.current
    const img = imageRef.current

    const drawBoxes = () => {
      const displayW = img.clientWidth
      const displayH = img.clientHeight
      if (displayW === 0 || displayH === 0) return

      canvas.width = displayW
      canvas.height = displayH

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, displayW, displayH)

      if (!ctx.roundRect) {
        ctx.roundRect = function(x, y, w, h, r) {
          const radius = Array.isArray(r) ? r[0] : (r || 0)
          ctx.beginPath()
          ctx.moveTo(x + radius, y)
          ctx.lineTo(x + w - radius, y)
          ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
          ctx.lineTo(x + w, y + h - radius)
          ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
          ctx.lineTo(x + radius, y + h)
          ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
          ctx.lineTo(x, y + radius)
          ctx.quadraticCurveTo(x, y, x + radius, y)
          ctx.closePath()
        }
      }

      const scaleX = displayW / (img.naturalWidth || displayW)
      const scaleY = displayH / (img.naturalHeight || displayH)

      detections.forEach(det => {
        const rawBbox = det.bbox || det.box || det.xyxy
        if (!rawBbox) return
        let x1, y1, x2, y2
        if (Array.isArray(rawBbox) && rawBbox.length >= 4) {
          ;[x1, y1, x2, y2] = rawBbox
        } else if (typeof rawBbox === 'object' && rawBbox !== null) {
          x1 = rawBbox.x1; y1 = rawBbox.y1; x2 = rawBbox.x2; y2 = rawBbox.y2
        } else return
        if (x1 == null || x2 == null) return

        // Normalised coords (0-1) → pixel coords
        if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
          x1 = x1 * (img.naturalWidth || displayW)
          y1 = y1 * (img.naturalHeight || displayH)
          x2 = x2 * (img.naturalWidth || displayW)
          y2 = y2 * (img.naturalHeight || displayH)
        }

        const sx1 = x1 * scaleX
        const sy1 = y1 * scaleY
        const sw = (x2 - x1) * scaleX
        const sh = (y2 - y1) * scaleY
        if (sw <= 2 || sh <= 2) return

        const effectiveClass = det.corrected_class || det.class_name
        const color = getColour(effectiveClass)
        const label = (effectiveClass || 'Unknown').replace(/_/g, ' ')
        const conf = det.confidence ? ` ${Math.round(det.confidence * 100)}%` : ''

        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(sx1, sy1, sw, sh)

        ctx.font = 'bold 11px Inter, -apple-system, sans-serif'
        const textW = ctx.measureText(label + conf).width + 8
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(sx1, Math.max(0, sy1 - 20), textW, 20, [4, 4, 0, 0])
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillText(label + conf, sx1 + 4, Math.max(16, sy1) - 4)
      })
    }

    if (img.complete && img.naturalWidth > 0) {
      drawBoxes()
    } else {
      img.onload = drawBoxes
    }
    const ro = new ResizeObserver(drawBoxes)
    ro.observe(img)
    return () => ro.disconnect()
  }, [detections, reviewingPage, state])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {state === STATES.IDLE && (
        <div className="absolute inset-0 bg-[#f2f2f7] dark:bg-[#1c1c1e]">
          {isDragActive && (
            <motion.div
              className="absolute inset-3 rounded-3xl border-2 border-dashed border-[#0A84FF]"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
      )}
      {state !== STATES.IDLE && (
        <div className="absolute inset-0 bg-[#f2f2f7] dark:bg-[#1c1c1e]" />
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 text-sm font-semibold rounded-xl px-3 py-2 transition-colors text-[#0A84FF] hover:bg-[#0A84FF]/10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Dashboard
        </motion.button>

        <div className="flex-1 text-center">
          <h2 className="text-base font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">
            {state === STATES.IDLE && 'New Analysis'}
            {state === STATES.UPLOADING && 'Uploading…'}
            {state === STATES.SELECTING && 'Select Pages'}
            {state === STATES.SCANNING && 'Analysing…'}
            {state === STATES.REVIEWING && 'Review Detections'}
            {state === STATES.ERROR && 'Analysis Failed'}
            {state === STATES.DONE && 'Saved to Plans'}
          </h2>
        </div>
        <div className="w-24" />
      </div>

      {/* Content area */}
      <div className="relative z-10 flex-1 overflow-hidden">

        {/* ── IDLE ── */}
        <AnimatePresence>
        {state === STATES.IDLE && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
            {...getRootProps()}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-24 h-24 rounded-3xl bg-[#0A84FF]/10 dark:bg-[#0A84FF]/20 flex items-center justify-center mx-auto mb-8"
              >
                {isDragActive ? (
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                ) : (
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                )}
              </motion.div>
              <AnimatePresence mode="wait">
                {isDragActive ? (
                  <motion.div key="drop" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <h2 className="text-4xl font-bold tracking-[-0.02em] text-[#0A84FF] mb-2">Drop to analyse</h2>
                    <p className="text-[#8e8e93]">Release to start</p>
                  </motion.div>
                ) : (
                  <motion.div key="idle-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h2 className="text-4xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-2">
                      Drop your floor plan here
                    </h2>
                    <p className="text-[#8e8e93] text-lg">or click to browse</p>
                    <p className="text-xs text-[#8e8e93] mt-3">Accepts .pdf files</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── UPLOADING ── */}
        <AnimatePresence>
        {state === STATES.UPLOADING && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center w-full max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">{file?.name}</h3>
              <p className="text-[#8e8e93] text-sm mb-6">Uploading & processing…</p>
              <div className="h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#0A84FF] rounded-full"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-[#8e8e93] mt-2">{uploadProgress}%</p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── SELECTING ── */}
        <AnimatePresence>
        {state === STATES.SELECTING && (
          <motion.div
            key="selecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Large preview with pan+zoom */}
            <div className="flex-1 flex items-center justify-center p-6 min-h-0">
              <div
                ref={previewContainerRef}
                className="relative overflow-hidden w-full h-full bg-gray-50 dark:bg-zinc-900 rounded-2xl"
                style={{ cursor: isPreviewPanning ? 'grabbing' : 'grab' }}
                onWheel={(e) => {
                  e.preventDefault()
                  const delta = e.deltaY > 0 ? 0.85 : 1.18
                  setPreviewZoom(z => Math.min(6, Math.max(0.5, z * delta)))
                }}
                onMouseDown={(e) => {
                  setIsPreviewPanning(true)
                  previewPanStart.current = { x: e.clientX - previewPan.x, y: e.clientY - previewPan.y }
                }}
                onMouseMove={(e) => {
                  if (!isPreviewPanning) return
                  setPreviewPan({ x: e.clientX - previewPanStart.current.x, y: e.clientY - previewPanStart.current.y })
                }}
                onMouseUp={() => setIsPreviewPanning(false)}
                onMouseLeave={() => setIsPreviewPanning(false)}
                onDoubleClick={() => { setPreviewZoom(1); setPreviewPan({ x: 0, y: 0 }) }}
              >
                <div style={{
                  transform: `scale(${previewZoom}) translate(${previewPan.x / previewZoom}px, ${previewPan.y / previewZoom}px)`,
                  transformOrigin: 'center center',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {previewPage?.thumbnail ? (
                    <img
                      src={previewPage.thumbnail}
                      alt={`Page ${previewPage.pageNum}`}
                      className="max-h-full max-w-full object-contain rounded-xl shadow-xl select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full max-w-lg h-80 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                      <p className="text-[#8e8e93]">Page {previewPage?.pageNum}</p>
                    </div>
                  )}
                </div>
                {/* Zoom hint */}
                <div className="absolute bottom-2 right-2 text-[10px] text-[#8e8e93] bg-white/80 dark:bg-zinc-800/80 rounded px-2 py-0.5 pointer-events-none">
                  {previewZoom === 1 ? 'Scroll to zoom · drag to pan' : `${Math.round(previewZoom * 100)}%`}
                </div>
              </div>
            </div>

            {/* Filmstrip + action buttons */}
            <div className="border-t border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl px-6 py-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                  Select floor plan page
                </p>
                <p className="text-xs text-[#8e8e93]">
                  {pages.length} page{pages.length !== 1 ? 's' : ''} · scroll to see all
                </p>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
                {pages.map(page => {
                  const isSelected = selectedPage === page.pageNum
                  return (
                    <button
                      key={page.pageNum}
                      onClick={() => {
                        setSelectedPage(page.pageNum)
                        setPreviewPage(page)
                        setPreviewZoom(1)
                        setPreviewPan({ x: 0, y: 0 })
                      }}
                      className={`relative flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden transition-all ${
                        isSelected
                          ? 'ring-4 ring-[#0A84FF] ring-offset-2 shadow-xl shadow-[#0A84FF]/30'
                          : 'opacity-60 hover:opacity-100 border border-gray-200'
                      }`}
                    >
                      {page.thumbnail ? (
                        <img src={page.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-[#8e8e93]">
                          Page {page.pageNum}
                        </div>
                      )}
                      {isSelected && (
                        <>
                          <div className="absolute inset-0 bg-[#0A84FF]/15" />
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0A84FF] flex items-center justify-center shadow">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-[#0A84FF] text-white text-center text-[10px] font-semibold py-0.5">
                            SELECTED
                          </div>
                        </>
                      )}
                      {!isSelected && (
                        <div className="absolute bottom-1 left-0 right-0 text-center">
                          <span className="text-xs bg-black/40 text-white px-1.5 py-0.5 rounded">P{page.pageNum}</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Analyse button */}
              <button
                disabled={!selectedPage}
                onClick={startAnalysis}
                className="w-full py-3 bg-[#0A84FF] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ScanLine size={18} strokeWidth={1.5} />
                Analyse Page {selectedPage}
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── SCANNING ── */}
        <AnimatePresence>
        {state === STATES.SCANNING && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex"
          >
            {/* Floor plan */}
            <div className="flex-1 relative overflow-hidden bg-black/5 dark:bg-white/5">
              {scanImage && (
                <img src={scanImage} alt="Floor plan" className="absolute inset-0 w-full h-full object-contain" />
              )}
              {!scanImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gray-200 dark:bg-zinc-700 rounded-2xl animate-pulse" />
                </div>
              )}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-[#0A84FF] shadow-lg"
                style={{ boxShadow: '0 0 12px 2px rgba(10,132,255,0.6)' }}
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 6, ease: 'linear' }}
              />
            </div>

            {/* Right panel */}
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-80 border-l border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 dark:border-white/10">
                <div className="mt-1 h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0A84FF] rounded-full"
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 gap-1">
                <p className="text-sm text-[#8e8e93] text-center">
                  {[...SCAN_STATUS_PHASES].reverse().find(p => scanTime >= p.afterSeconds)?.message || SCAN_STATUS_PHASES[0].message}
                </p>
                <p className="text-xs text-[#8e8e93] text-center mt-1">{scanTime}s</p>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── REVIEWING ── */}
        <AnimatePresence>
        {state === STATES.REVIEWING && (
          <motion.div
            key="reviewing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex h-full overflow-hidden"
          >
            {/* LEFT: Annotated floor plan — pan/zoom */}
            <div
              ref={reviewContainerRef}
              className="flex-1 relative overflow-hidden"
              style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
              onWheel={handleWheel}
              onMouseDown={handlePanMouseDown}
              onMouseMove={handlePanMouseMove}
              onMouseUp={handlePanMouseUp}
              onMouseLeave={handlePanMouseUp}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Re-analyse button — fixed, outside transform */}
              <button
                onClick={() => setState(STATES.SELECTING)}
                className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-2 py-1 rounded-lg"
              >
                <ArrowLeft size={16} strokeWidth={1.5} /> Re-analyse
              </button>

              {/* Transform wrapper — image + canvas move together */}
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
                  padding: '24px',
                  background: 'var(--review-bg, rgba(0,0,0,0.05))',
                }}
              >
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    ref={imageRef}
                    src={reviewingPage?.dataUrl || scanImage}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                    style={{ maxHeight: 'calc(100vh - 120px)', display: 'block' }}
                    alt="Floor plan"
                    draggable={false}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 pointer-events-none rounded-xl"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>

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
            </div>

            {/* RIGHT: Tabs panel */}
            <div className="w-[420px] flex-shrink-0 border-l border-gray-200 dark:border-white/10 flex flex-col bg-white dark:bg-zinc-900">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-white/10">
                {['Detections', 'Notes'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'text-[#0A84FF] border-b-2 border-[#0A84FF]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'Detections' && <DetectionsTab detections={detections} setDetections={setDetections} />}
                {activeTab === 'Notes' && <NotesTab notes={notes} setNotes={setNotes} />}
              </div>

              {/* Footer — Save to Plans */}
              <div className="p-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={handleSaveToPlan}
                  disabled={savingPlan}
                  className="w-full py-3 rounded-xl bg-[#0A84FF] text-white font-semibold text-sm hover:bg-[#0070d6] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {savingPlan ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Save to Plans →</>
                  )}
                </button>
                <p className="text-xs text-center text-gray-400 mt-2">Fill specs and generate quote in Plans</p>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── ERROR ── */}
        <AnimatePresence>
        {state === STATES.ERROR && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center max-w-sm px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-2"
              >
                Analysis failed
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-[#8e8e93] mb-1"
              >
                Something went wrong — please try again.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-[#8e8e93] mb-8"
              >
                If this keeps happening, the AI model may be temporarily unavailable.
              </motion.p>
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => setState(STATES.SELECTING)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 bg-[#0A84FF] text-white font-semibold rounded-xl hover:bg-[#0070d6] transition-colors"
              >
                Try Again
              </motion.button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── DONE ── */}
        <AnimatePresence>
        {state === STATES.DONE && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-[#34c759] flex items-center justify-center mx-auto mb-6"
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-2"
              >
                Saved to Plans
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-3 justify-center mt-8"
              >
                <motion.button
                  onClick={() => router.push('/admin/plans')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-semibold rounded-xl transition-all"
                >
                  View Plans
                </motion.button>
                <motion.button
                  onClick={() => {
                    setFile(null); setPages([]); setSelectedPage(null)
                    setDetections([])
                    setState(STATES.IDLE)
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold rounded-xl transition-all"
                >
                  New Analysis
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

      </div>
    </motion.div>
  )
}
