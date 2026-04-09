'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { DETECTION_COLOURS, DETECTION_LABELS, DEFAULT_UNIT_PRICES } from '@/lib/mockData'

const STATES = { IDLE: 'idle', UPLOADING: 'uploading', SELECTING: 'selecting', SCANNING: 'scanning', REVIEWING: 'reviewing', DONE: 'done' }

function normalise(name) {
  return DETECTION_LABELS[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getColour(name) {
  return DETECTION_COLOURS[name] || '#0A84FF'
}

function getUnitPrice(name) {
  return DEFAULT_UNIT_PRICES[normalise(name)] || 285
}

export default function AnalysisOverlay({ onClose }) {
  const [state, setState] = useState(STATES.IDLE)
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState([]) // [{pageNum, thumbnail}]
  const [selectedPages, setSelectedPages] = useState([])
  const [previewPage, setPreviewPage] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [planId, setPlanId] = useState(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [detections, setDetections] = useState([])
  const [liveDetections, setLiveDetections] = useState([]) // revealed during scan
  const [scanImage, setScanImage] = useState(null)
  const [analysisId, setAnalysisId] = useState(null)
  const [quoteItems, setQuoteItems] = useState([])
  const [clientName, setClientName] = useState('')
  const [notes, setNotes] = useState('')
  const [reviewTab, setReviewTab] = useState('detections')
  const [savedQuoteId, setSavedQuoteId] = useState(null)
  const [scanTime, setScanTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const router = useRouter()

  // PDF rendering
  async function renderPDFPages(arrayBuffer) {
    try {
      // Dynamic import pdfjs
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const pageImages = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        pageImages.push({ pageNum: i, thumbnail: canvas.toDataURL('image/jpeg', 0.8) })
      }
      return pageImages
    } catch (err) {
      console.error('PDF render error:', err)
      // Return a single placeholder page
      return [{ pageNum: 1, thumbnail: null }]
    }
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    const f = acceptedFiles[0]
    if (!f) return
    setFile(f)
    setState(STATES.UPLOADING)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 15, 90))
    }, 200)

    try {
      // Render PDF pages in background
      const ab = await f.arrayBuffer()
      const pagesPromise = renderPDFPages(ab.slice(0))

      // Upload to server
      const formData = new FormData()
      formData.append('file', f)
      const uploadRes = await fetch('/api/plans/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      clearInterval(progressInterval)
      setUploadProgress(100)
      setPlanId(uploadData.planId)

      // Wait for pages
      const renderedPages = await pagesPromise
      setPages(renderedPages)
      setPreviewPage(renderedPages[0])
      // Auto-select first page
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

  async function startAnalysis() {
    if (!selectedPages.length) return
    setState(STATES.SCANNING)
    setScanProgress(0)
    setLiveDetections([])
    const startTime = Date.now()

    const pageImage = pages.find(p => selectedPages.includes(p.pageNum))
    setScanImage(pageImage?.thumbnail || null)

    // Progress animation
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
          imageBase64: pageImage?.thumbnail || '',
        }),
      })
      const data = await res.json()
      clearInterval(scanInterval)

      const dets = data.detections || []
      setDetections(dets)
      setAnalysisId(data.analysisId)

      // Animate detections appearing one by one
      for (let i = 0; i < dets.length; i++) {
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300))
        setLiveDetections(prev => [...prev, dets[i]])
        setScanProgress(50 + (i / dets.length) * 50)
      }

      setScanProgress(100)
      setScanTime(Math.round((Date.now() - startTime) / 100) / 10)

      // Build quote items
      const grouped = {}
      dets.forEach(d => {
        const label = normalise(d.class_name)
        if (!grouped[label]) grouped[label] = { name: label, class_name: d.class_name, qty: 0, unit_price: getUnitPrice(d.class_name), confidence: d.confidence }
        grouped[label].qty++
      })
      setQuoteItems(Object.values(grouped))

      setTimeout(() => setState(STATES.REVIEWING), 1000)
    } catch (err) {
      clearInterval(scanInterval)
      console.error('Analysis failed:', err)
      setState(STATES.IDLE)
    }
  }

  async function saveQuote(sendEmail = false) {
    const items = quoteItems.map(item => ({
      name: item.name,
      qty: item.qty,
      unit_price: item.unit_price,
      total: item.qty * item.unit_price,
    }))

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, clientName, items, notes }),
      })
      const data = await res.json()
      setSavedQuoteId(data.quoteId)

      if (sendEmail && data.quoteId) {
        await fetch(`/api/quotes/${data.quoteId}/approve`, { method: 'POST' })
      }

      setState(STATES.DONE)
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const subtotal = quoteItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const gst = subtotal * 0.15
  const total = subtotal + gst

  // Draw detection boxes on canvas
  useEffect(() => {
    if (state !== STATES.REVIEWING) return
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    const draw = () => {
      canvas.width = img.offsetWidth
      canvas.height = img.offsetHeight
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const W = canvas.width, H = canvas.height

      detections.forEach((det, i) => {
        const bbox = det.bbox || {}
        // Normalise bbox - could be fractional or pixel coords
        let x1, y1, x2, y2
        if (bbox.x1 !== undefined) {
          if (bbox.x1 <= 1) {
            // Fractional
            x1 = bbox.x1 * W; y1 = bbox.y1 * H
            x2 = (bbox.x1 + (bbox.x2 || 0.1)) * W; y2 = (bbox.y1 + (bbox.y2 || 0.1)) * H
          } else {
            x1 = bbox.x1; y1 = bbox.y1; x2 = bbox.x2; y2 = bbox.y2
          }
        } else {
          // Random position for demo
          x1 = (0.05 + (i * 0.11 % 0.75)) * W
          y1 = (0.05 + (i * 0.13 % 0.75)) * H
          x2 = x1 + 0.12 * W
          y2 = y1 + 0.1 * H
        }

        const colour = getColour(det.class_name)
        const label = normalise(det.class_name)

        // Draw box
        ctx.strokeStyle = colour
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.rect(x1, y1, x2 - x1, y2 - y1)
        ctx.stroke()

        // Fill with light tint
        ctx.fillStyle = colour + '18'
        ctx.fill()

        // Label background
        const confText = det.confidence ? `${Math.round(det.confidence * 100)}%` : ''
        const labelText = `${label} ${confText}`
        ctx.font = '10px Inter, sans-serif'
        const textW = ctx.measureText(labelText).width + 8
        ctx.fillStyle = colour
        ctx.beginPath()
        ctx.roundRect(x1, y1 - 20, textW, 18, 3)
        ctx.fill()

        ctx.fillStyle = 'white'
        ctx.fillText(labelText, x1 + 4, y1 - 6)
      })
    }

    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [state, detections])

  // Group live detections by type for display
  const liveGrouped = {}
  liveDetections.forEach(d => {
    const label = normalise(d.class_name)
    if (!liveGrouped[label]) liveGrouped[label] = { label, class_name: d.class_name, count: 0 }
    liveGrouped[label].count++
  })

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: state === STATES.IDLE && isDragActive ? 'rgba(10,132,255,0.06)' : undefined }}
    >
      {/* Background blur when drag active */}
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
          className={`flex items-center gap-1.5 text-sm font-semibold rounded-xl px-3 py-2 transition-colors ${
            state === STATES.SCANNING
              ? 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'
              : 'text-[#0A84FF] hover:bg-[#0A84FF]/10'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Dashboard
        </motion.button>

        <div className="flex-1 text-center">
          <h2 className="text-base font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">
            {state === STATES.IDLE && 'New Analysis'}
            {state === STATES.UPLOADING && 'Uploading…'}
            {state === STATES.SELECTING && 'Select Pages'}
            {state === STATES.SCANNING && 'Analysing…'}
            {state === STATES.REVIEWING && 'Review & Quote'}
            {state === STATES.DONE && 'Quote Saved'}
          </h2>
        </div>
        <div className="w-24" />
      </div>

      {/* Content area */}
      <div className="relative z-10 flex-1 overflow-hidden">

        {/* IDLE STATE */}
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
                    <h2 className="text-4xl font-black tracking-[-0.02em] text-[#0A84FF] mb-2">Drop to analyse</h2>
                    <p className="text-[#8e8e93]">Release to start</p>
                  </motion.div>
                ) : (
                  <motion.div key="idle-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h2 className="text-4xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-2">
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

        {/* UPLOADING STATE */}
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
              <h3 className="text-xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">{file?.name}</h3>
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

        {/* SELECTING STATE */}
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

            {/* Filmstrip */}
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

              <motion.button
                onClick={startAnalysis}
                disabled={!selectedPages.length}
                whileHover={selectedPages.length ? { scale: 1.01 } : {}}
                whileTap={selectedPages.length ? { scale: 0.98 } : {}}
                className="w-full py-4 bg-[#0A84FF] hover:bg-[#0070d6] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black tracking-[-0.01em] text-lg rounded-xl transition-all"
              >
                {selectedPages.length
                  ? `Analyse ${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''}`
                  : 'Select pages to analyse'
                }
              </motion.button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* SCANNING STATE */}
        <AnimatePresence>
        {state === STATES.SCANNING && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex"
          >
            {/* Floor plan (65%) */}
            <div className="flex-1 relative overflow-hidden bg-black/5 dark:bg-white/5">
              {scanImage && (
                <img src={scanImage} alt="Floor plan" className="absolute inset-0 w-full h-full object-contain" />
              )}
              {!scanImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gray-200 dark:bg-zinc-700 rounded-2xl animate-pulse" />
                </div>
              )}

              {/* Scan line */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-[#0A84FF] shadow-lg"
                style={{ boxShadow: '0 0 12px 2px rgba(10,132,255,0.6)' }}
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 6, ease: 'linear' }}
              />

              {/* Blue tint following scan line */}
              <motion.div
                className="absolute left-0 right-0 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, rgba(10,132,255,0.03), transparent 20px)' }}
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 6, ease: 'linear' }}
              />
            </div>

            {/* Right panel (35%) */}
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-80 border-l border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93]">Live Detections</p>
                  <motion.span
                    className="text-3xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] tabular-nums"
                    key={liveDetections.length}
                  >
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
                      <span className="text-lg font-black tabular-nums text-[#1c1c1e] dark:text-[#f5f5f7]">{count}</span>
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
                    <p className="font-black text-sm">Analysis complete</p>
                  </div>
                  <p className="text-xs text-[#8e8e93] mt-1">{liveDetections.length} components · {scanTime}s</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* REVIEWING STATE */}
        <AnimatePresence>
        {state === STATES.REVIEWING && (
          <motion.div
            key="reviewing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex"
          >
            {/* Left: Annotated plan (60%) */}
            <div className="flex-1 relative overflow-hidden bg-black/5 dark:bg-white/5">
              {scanImage && (
                <img ref={imgRef} src={scanImage} alt="Floor plan" className="absolute inset-0 w-full h-full object-contain" />
              )}
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            </div>

            {/* Right: Quote editor (40%) */}
            <div className="w-96 border-l border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-gray-100 dark:border-white/10">
                {['detections', 'quote', 'notes'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setReviewTab(tab)}
                    className={`flex-1 py-3.5 text-xs font-semibold tracking-[0.08em] uppercase transition-colors ${
                      reviewTab === tab
                        ? 'text-[#0A84FF] border-b-2 border-[#0A84FF]'
                        : 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {reviewTab === 'detections' && (
                  <div className="p-4 space-y-2">
                    {quoteItems.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getColour(item.class_name) }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">{item.name}</p>
                          <p className="text-xs text-[#8e8e93]">{Math.round((item.confidence || 0.9) * 100)}% confidence</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setQuoteItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: Math.max(0, it.qty - 1) } : it).filter(it => it.qty > 0))}
                            className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-bold hover:bg-gray-300 dark:hover:bg-zinc-600"
                          >−</button>
                          <span className="w-6 text-center text-sm font-black tabular-nums">{item.qty}</span>
                          <button
                            onClick={() => setQuoteItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it))}
                            className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-bold hover:bg-gray-300 dark:hover:bg-zinc-600"
                          >+</button>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <p className="text-sm font-black text-[#1c1c1e] dark:text-[#f5f5f7]">${(item.qty * item.unit_price).toFixed(0)}</p>
                          <p className="text-xs text-[#8e8e93]">${item.unit_price}/ea</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                      <div className="flex justify-between text-sm text-[#8e8e93]">
                        <span>{quoteItems.length} types, {quoteItems.reduce((s,i)=>s+i.qty,0)} items</span>
                        <span className="font-black text-[#1c1c1e] dark:text-[#f5f5f7]">${subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {reviewTab === 'quote' && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] block mb-1.5">Client Name</label>
                      <input
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="Company or client name"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      {quoteItems.map(item => (
                        <div key={item.name} className="flex justify-between text-sm py-1">
                          <span className="text-[#8e8e93]">{item.name} × {item.qty}</span>
                          <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">${(item.qty * item.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8e8e93]">Subtotal</span>
                        <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8e8e93]">GST (15%)</span>
                        <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">${gst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-black">
                        <span className="text-[#1c1c1e] dark:text-[#f5f5f7]">Total NZD</span>
                        <span className="text-[#0A84FF]">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {reviewTab === 'notes' && (
                  <div className="p-4">
                    <label className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] block mb-2">Internal Notes</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Notes visible to staff only…"
                      rows={8}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Save actions */}
              <div className="p-4 border-t border-gray-100 dark:border-white/10 space-y-2">
                <motion.button
                  onClick={() => saveQuote(true)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-black rounded-xl transition-all"
                >
                  Approve & Send Quote
                </motion.button>
                <motion.button
                  onClick={() => saveQuote(false)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold rounded-xl transition-all text-sm"
                >
                  Save as Draft
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* DONE STATE */}
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
                className="text-3xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-2"
              >
                Quote Saved
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[#8e8e93] text-xl font-semibold mb-8"
              >
                {savedQuoteId}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-3 justify-center"
              >
                <motion.button
                  onClick={() => router.push(`/admin/quotes/${savedQuoteId}`)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-semibold rounded-xl transition-all"
                >
                  View Quote
                </motion.button>
                <motion.button
                  onClick={() => { setFile(null); setPages([]); setSelectedPages([]); setDetections([]); setLiveDetections([]); setQuoteItems([]); setSavedQuoteId(null); setState(STATES.IDLE) }}
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
