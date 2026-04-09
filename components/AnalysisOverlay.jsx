'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ScanLine, Trash2 } from 'lucide-react'
import { DETECTION_COLOURS, DETECTION_LABELS, DEFAULT_UNIT_PRICES } from '@/lib/mockData'

const STATES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SELECTING: 'selecting',
  SCANNING: 'scanning',
  REVIEWING: 'reviewing',
  DONE: 'done',
}

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
function DetectionsTab({ detections, setDetections }) {
  const updateQty = (i, qty) => {
    const updated = [...detections]
    updated[i] = { ...updated[i], qty: Math.max(1, qty) }
    setDetections(updated)
  }
  const updatePrice = (i, price) => {
    const updated = [...detections]
    updated[i] = { ...updated[i], unit_price: parseFloat(price) || 0 }
    setDetections(updated)
  }
  const remove = (i) => setDetections(detections.filter((_, j) => j !== i))

  const subtotal = detections.reduce((s, d) => s + (d.qty || 1) * (d.unit_price || 0), 0)

  return (
    <div className="p-4 space-y-2">
      {detections.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">No detections yet</div>
      )}
      {detections.map((det, i) => {
        const color = getColour(det.class_name)
        return (
          <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5 group">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{(det.class_name || '').replace(/_/g, ' ')}</p>
              {det.confidence != null && (
                <p className="text-xs text-gray-400">{Math.round(det.confidence * 100)}% confidence</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => updateQty(i, (det.qty || 1) - 1)} className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-sm flex items-center justify-center">−</button>
              <span className="w-6 text-center text-sm tabular-nums">{det.qty || 1}</span>
              <button onClick={() => updateQty(i, (det.qty || 1) + 1)} className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-sm flex items-center justify-center">+</button>
            </div>
            <div className="w-20">
              <input
                type="number"
                value={det.unit_price || 0}
                onChange={e => updatePrice(i, e.target.value)}
                className="w-full text-right text-sm bg-transparent border-b border-gray-200 dark:border-white/10 focus:border-[#0A84FF] outline-none tabular-nums py-0.5"
              />
            </div>
            <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500">
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        )
      })}
      <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex justify-between text-sm">
        <span className="text-gray-500">{detections.length} components</span>
        <span className="font-semibold tabular-nums">${subtotal.toFixed(2)}</span>
      </div>
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
  const [selectedPages, setSelectedPages] = useState([])
  const [previewPage, setPreviewPage] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [planId, setPlanId] = useState(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [detections, setDetections] = useState([])
  const [liveDetections, setLiveDetections] = useState([])
  const [scanImage, setScanImage] = useState(null)
  const [reviewingPage, setReviewingPage] = useState(null)
  const [analysisId, setAnalysisId] = useState(null)
  const [notes, setNotes] = useState('')
  const [activeTab, setActiveTab] = useState('Detections')
  const [scanTime, setScanTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)

  const canvasRef = useRef(null)
  const imageRef = useRef(null)
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
      setSelectedPages([renderedPages[0]?.pageNum || 1])

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
    if (!selectedPages.length) return
    setState(STATES.SCANNING)
    setScanProgress(0)
    setLiveDetections([])
    const startTime = Date.now()

    const pageData = pages.find(p => selectedPages.includes(p.pageNum))
    setScanImage(pageData?.thumbnail || null)
    setReviewingPage(pageData || null)

    const scanInterval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 95) return p
        return p + (95 - p) * 0.04
      })
      setScanTime(Math.round((Date.now() - startTime) / 100) / 10)
    }, 100)

    try {
      const res = await fetch(`/api/plans/${planId}/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNums: selectedPages,
          imageBase64: pageData?.thumbnail || '',
        }),
      })
      const data = await res.json()
      clearInterval(scanInterval)

      const dets = data.detections || []
      const flatDets = dets.map(d => ({
        ...d,
        qty: 1,
        unit_price: getUnitPrice(d.class_name),
      }))
      setDetections(flatDets)
      setAnalysisId(data.analysisId)

      for (let i = 0; i < dets.length; i++) {
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300))
        setLiveDetections(prev => [...prev, dets[i]])
        setScanProgress(50 + (i / dets.length) * 50)
      }

      setScanProgress(100)
      setScanTime(Math.round((Date.now() - startTime) / 100) / 10)
      setTimeout(() => setState(STATES.REVIEWING), 1000)
    } catch (err) {
      clearInterval(scanInterval)
      console.error('Analysis failed:', err)
      setState(STATES.IDLE)
    }
  }

  // ─── Save to Plans ────────────────────────────────────────────────────────
  async function handleSaveToPlan() {
    setSavingPlan(true)
    // Update plan status to in_review
    await fetch(`/api/plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_status: 'in_review' }),
    })
    setSavingPlan(false)
    // Close overlay and navigate to plan review
    onClose()
    window.location.href = `/admin/plans/${planId}`
  }

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
        if (Array.isArray(rawBbox)) {
          if (rawBbox.length < 4) return
          ;[x1, y1, x2, y2] = rawBbox
        } else if (typeof rawBbox === 'object') {
          x1 = rawBbox.x1; y1 = rawBbox.y1; x2 = rawBbox.x2; y2 = rawBbox.y2
        } else {
          return
        }
        if (x1 == null || y1 == null || x2 == null || y2 == null) return
        if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
          x1 = x1 * (img.naturalWidth || displayW)
          y1 = y1 * (img.naturalHeight || displayH)
          x2 = x2 * (img.naturalWidth || displayW)
          y2 = y2 * (img.naturalHeight || displayH)
        }
        const sx1 = x1 * scaleX, sy1 = y1 * scaleY
        const sw = (x2 - x1) * scaleX, sh = (y2 - y1) * scaleY
        if (sw <= 0 || sh <= 0 || sx1 < 0 || sy1 < 0) return
        if (sx1 > displayW || sy1 > displayH) return

        const color = getColour(det.class_name)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(sx1, sy1, sw, sh)

        const label = (det.class_name || '').replace(/_/g, ' ')
        const conf = det.confidence ? ` ${Math.round(det.confidence * 100)}%` : ''
        const labelText = label + conf
        ctx.font = 'bold 11px Inter, -apple-system, sans-serif'
        const textW = ctx.measureText(labelText).width + 8
        const labelH = 20

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(sx1, Math.max(0, sy1 - labelH), textW, labelH, [4, 4, 0, 0])
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(labelText, sx1 + 4, Math.max(labelH, sy1) - 4)
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

  // ─── Live detections grouping (scan state) ────────────────────────────────
  const liveGrouped = {}
  liveDetections.forEach(d => {
    const label = normalise(d.class_name)
    if (!liveGrouped[label]) liveGrouped[label] = { label, class_name: d.class_name, count: 0 }
    liveGrouped[label].count++
  })

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
            {/* Large preview */}
            <div className="flex-1 flex items-center justify-center p-6 min-h-0">
              {previewPage?.thumbnail ? (
                <img
                  src={previewPage.thumbnail}
                  alt={`Page ${previewPage.pageNum}`}
                  className="max-h-full max-w-full object-contain rounded-2xl shadow-xl"
                />
              ) : (
                <div className="w-full max-w-lg h-80 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                  <p className="text-[#8e8e93]">Page {previewPage?.pageNum}</p>
                </div>
              )}
            </div>

            {/* Filmstrip + action buttons */}
            <div className="border-t border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl px-6 py-4">
              <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
                {pages.map(page => {
                  const isSelected = selectedPages.includes(page.pageNum)
                  return (
                    <motion.button
                      key={page.pageNum}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setPreviewPage(page)
                        setSelectedPages(prev =>
                          prev.includes(page.pageNum)
                            ? prev.filter(n => n !== page.pageNum)
                            : [...prev, page.pageNum]
                        )
                      }}
                      className={`relative flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden border-2 transition-all ${
                        isSelected ? 'border-[#0A84FF] shadow-lg shadow-[#0A84FF]/20' : 'border-gray-200 dark:border-white/10'
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
                        <div className="absolute inset-0 bg-[#0A84FF]/10 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-[#0A84FF] flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-1 left-0 right-0 text-center">
                        <span className="text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">P{page.pageNum}</span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Single action button */}
              <button
                disabled={selectedPages.length === 0}
                onClick={startAnalysis}
                className="w-full py-3 bg-[#0A84FF] text-white rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ScanLine size={18} strokeWidth={1.5} />
                Detect Components {selectedPages.length > 0 ? `(${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''})` : ''}
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
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93]">Live Detections</p>
                  <motion.span className="text-3xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] tabular-nums" key={liveDetections.length}>
                    {liveDetections.length}
                  </motion.span>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0A84FF] rounded-full"
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <AnimatePresence>
                  {Object.values(liveGrouped).map(({ label, class_name, count }) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, scale: 0.9, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: getColour(class_name) }} />
                      <span className="flex-1 text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] truncate">{label}</span>
                      <span className="text-lg font-bold tabular-nums text-[#1c1c1e] dark:text-[#f5f5f7]">{count}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {scanProgress === 100 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 border-t border-gray-100 dark:border-white/10"
                >
                  <div className="flex items-center gap-2 text-[#34c759]">
                    <div className="w-6 h-6 rounded-full bg-[#34c759] flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <p className="font-bold text-sm">Analysis complete</p>
                  </div>
                  <p className="text-xs text-[#8e8e93] mt-1">{liveDetections.length} components · {scanTime}s</p>
                </motion.div>
              )}
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
            {/* LEFT: Annotated floor plan */}
            <div className="flex-1 relative bg-gray-50 dark:bg-black/20 flex items-center justify-center p-6 overflow-hidden">
              <button
                onClick={() => setState(STATES.SELECTING)}
                className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors z-10"
              >
                <ArrowLeft size={16} strokeWidth={1.5} /> Re-analyse
              </button>
              <div className="relative max-w-full max-h-full">
                <img
                  ref={imageRef}
                  src={reviewingPage?.dataUrl || scanImage}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                  style={{ maxHeight: 'calc(100vh - 120px)' }}
                  alt="Floor plan"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 pointer-events-none rounded-xl"
                  style={{ width: '100%', height: '100%' }}
                />
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
                    setFile(null); setPages([]); setSelectedPages([])
                    setDetections([]); setLiveDetections([])
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
