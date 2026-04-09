'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, ChevronRight, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DOOR_TYPES = [
  'L_prehung_door', 'R_prehung_door', 'Double_prehung_door',
  'S_cavity_slider', 'Double_cavity_slider',
  'Bi_folding_door', 'Double_bifold_door',
  'Wardrobe_sliding_two_doors_1', 'Wardrobe_sliding_three_doors',
  'Barn_wall_slider', 'Exterior_door', 'Other',
]

const DETECTION_COLOURS = {
  L_prehung_door: '#0A84FF', R_prehung_door: '#0A84FF',
  Double_prehung_door: '#FF9F0A', S_cavity_slider: '#30D158',
  Double_cavity_slider: '#30D158', Bi_folding_door: '#BF5AF2',
  Double_bifold_door: '#BF5AF2', Wardrobe_sliding_two_doors_1: '#FF375F',
  Wardrobe_sliding_three_doors: '#FF375F', Barn_wall_slider: '#64D2FF',
  Exterior_door: '#FF6B00', Other: '#8E8E93',
}

function getColour(name) { return DETECTION_COLOURS[name] || '#8E8E93' }

export default function PlanReviewPage() {
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
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const saveTimers = useRef({})

  // Load plan + detections
  useEffect(() => {
    fetch(`/api/plans/${planId}`)
      .then(r => r.json())
      .then(d => {
        setPlan(d.plan)
        setDetections((d.detections || []).map(det => ({
          ...det,
          specs: (() => { try { return JSON.parse(det.specs_json || '{}') } catch { return {} } })(),
          bbox: (() => { try { return JSON.parse(det.bbox_json || 'null') } catch { return null } })(),
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [planId])

  // Load clients
  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || []))
  }, [])

  // Render PDF pages
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

  // Draw detection boxes on canvas
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

      // object-contain: find the actual rendered content size
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
      canvas.style.left = ((elementW - contentW) / 2) + 'px'
      canvas.style.top = ((elementH - contentH) / 2) + 'px'

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, contentW, contentH)

      if (!ctx.roundRect) {
        ctx.roundRect = function(x, y, w, h, r) {
          const rad = Array.isArray(r) ? r[0] : (r || 0)
          ctx.beginPath()
          ctx.moveTo(x + rad, y); ctx.lineTo(x + w - rad, y)
          ctx.quadraticCurveTo(x + w, y, x + w, y + rad)
          ctx.lineTo(x + w, y + h - rad)
          ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h)
          ctx.lineTo(x + rad, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rad)
          ctx.lineTo(x, y + rad); ctx.quadraticCurveTo(x, y, x + rad, y)
          ctx.closePath()
        }
      }

      const scaleX = contentW / naturalW
      const scaleY = contentH / naturalH
      const pageDetections = detections.filter(d => (d.page_num || 1) === currentPage)

      pageDetections.forEach(det => {
        const rawBbox = det.bbox
        if (!rawBbox) return
        let x1, y1, x2, y2
        if (Array.isArray(rawBbox)) { [x1, y1, x2, y2] = rawBbox }
        else if (typeof rawBbox === 'object') { x1 = rawBbox.x1; y1 = rawBbox.y1; x2 = rawBbox.x2; y2 = rawBbox.y2 }
        else return
        if (x1 == null) return
        // Normalised 0-1 coords → pixel coords in natural image space
        if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
          x1 *= naturalW; y1 *= naturalH; x2 *= naturalW; y2 *= naturalH
        }
        const sx1 = x1 * scaleX, sy1 = y1 * scaleY
        const sw = (x2 - x1) * scaleX, sh = (y2 - y1) * scaleY
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
        ctx.roundRect(sx1, Math.max(0, sy1 - 20), textW, 20, [4, 4, 0, 0])
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillText(label, sx1 + 4, Math.max(16, sy1) - 4)
      })
    }

    if (img.complete && img.naturalWidth > 0) draw()
    else img.onload = draw
    const ro = new ResizeObserver(draw)
    ro.observe(img)
    return () => ro.disconnect()
  }, [detections, currentPage, pages, selectedDetId])

  const updateDetection = useCallback((detId, changes) => {
    setDetections(prev => prev.map(d => d.id === detId ? { ...d, ...changes } : d))
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
  }, [planId])

  const deleteDetection = useCallback((detId) => {
    setDetections(prev => prev.filter(d => d.id !== detId))
    fetch(`/api/plans/${planId}/detections/${detId}`, { method: 'DELETE' })
  }, [planId])

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentPageData = pages.find(p => p.pageNum === currentPage)
  const pageDetections = detections.filter(d => (d.page_num || 1) === currentPage)
  const totalDetections = detections.length

  return (
    <div className="flex h-screen overflow-hidden bg-[#f2f2f7] dark:bg-[#1c1c1e]">

      {/* LEFT: PDF Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-white/10">
          <button onClick={() => router.push('/admin/plans')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0A84FF] transition-colors">
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
            <button onClick={() => setShowClientModal(true)}
              className="text-xs text-[#0A84FF] bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
              Assign Client
            </button>
          )}
        </div>

        {/* PDF main view */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-gray-100 dark:bg-zinc-800/50">
          {currentPageData ? (
            <div className="relative max-w-full max-h-full">
              <img
                ref={imageRef}
                src={currentPageData.dataUrl}
                className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
                style={{ maxHeight: 'calc(100vh - 160px)' }}
                alt={`Page ${currentPage}`}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 pointer-events-none rounded-xl"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-[#0A84FF] rounded-full animate-spin" />
              <p className="text-sm">Loading PDF…</p>
            </div>
          )}
        </div>

        {/* Page filmstrip */}
        {pages.length > 1 && (
          <div className="flex gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-white/10 overflow-x-auto">
            {pages.map(page => (
              <button key={page.pageNum}
                onClick={() => setCurrentPage(page.pageNum)}
                className={`flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  page.pageNum === currentPage
                    ? 'border-[#0A84FF] shadow-md'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-400'
                }`}
              >
                <img src={page.dataUrl} className="w-full h-full object-cover" alt={`Page ${page.pageNum}`} />
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
            <span className="text-sm text-gray-400 tabular-nums">{totalDetections} total</span>
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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Page {currentPage}</p>
            </div>
          )}

          <AnimatePresence>
            {pageDetections.map((det) => (
              <DetectionCard
                key={det.id}
                det={det}
                isSelected={det.id === selectedDetId}
                onClick={() => setSelectedDetId(det.id === selectedDetId ? null : det.id)}
                onUpdate={changes => updateDetection(det.id, changes)}
                onDelete={() => deleteDetection(det.id)}
              />
            ))}
          </AnimatePresence>

          {pages.length > 1 && detections.filter(d => (d.page_num || 1) !== currentPage).length > 0 && (
            <div className="px-4 pt-4 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Other pages</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {detections.filter(d => (d.page_num || 1) !== currentPage).length} components on other pages
              </p>
            </div>
          )}
        </div>

        {/* Footer: Generate Quote */}
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

      {/* Client assignment modal */}
      {showClientModal && (
        <ClientModal
          clients={clients}
          onSelect={async (client) => {
            await fetch(`/api/plans/${planId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ client_id: client.id, client_name: client.name, client_company: client.company }),
            })
            setPlan(p => ({ ...p, client_name: client.name, client_company: client.company }))
            setShowClientModal(false)
          }}
          onClose={() => setShowClientModal(false)}
        />
      )}
    </div>
  )
}

// ─── Detection Card ────────────────────────────────────────────────────────────
function DetectionCard({ det, isSelected, onClick, onUpdate, onDelete }) {
  const color = getColour(det.corrected_class || det.class_name)
  const specs = det.specs || {}

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`mx-3 my-1.5 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-[#0A84FF] bg-blue-50/50 dark:bg-blue-950/20 shadow-md'
          : 'border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/50 hover:border-gray-300'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 p-3" onClick={onClick}>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
            {(det.corrected_class || det.class_name || '').replace(/_/g, ' ')}
          </p>
          {det.confidence != null && (
            <p className="text-xs text-gray-400">{Math.round(det.confidence * 100)}% confidence</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
        <ChevronRight
          size={14}
          className={`text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`}
          strokeWidth={1.5}
        />
      </div>

      {/* Expanded spec fields */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100 dark:border-white/5"
          >
            <div className="p-3 space-y-3">
              {/* Door type */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Door Type</label>
                <select
                  value={det.corrected_class || det.class_name || ''}
                  onChange={e => onUpdate({ corrected_class: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7]"
                >
                  {DOOR_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              {/* Interior/Exterior */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Location</label>
                <div className="flex gap-2">
                  {['Interior', 'Exterior'].map(loc => (
                    <button
                      key={loc}
                      onClick={e => { e.stopPropagation(); onUpdate({ specs: { ...specs, location: loc } }) }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        (specs.location || 'Interior') === loc
                          ? 'bg-[#0A84FF] text-white'
                          : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spec grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Width (mm)', 'width_mm', ['600','700','760','810','860','910','Custom']],
                  ['Height (mm)', 'height_mm', ['2040','2100','Custom']],
                  ['Core', 'core', ['Hollow Core','Solid Core','Fire Rated (FD30)']],
                  ['Finish', 'finish', ['Raw','Primed','Pre-finished White']],
                  ['Frame', 'frame', ['LJ&P Standard','Rebate Only','No Frame']],
                  ['Handing', 'handing', ['Left Hand','Right Hand','N/A']],
                ].map(([label, field, options]) => (
                  <div key={field}>
                    <label className="text-xs text-gray-400 block mb-1">{label}</label>
                    <select
                      value={specs[field] || ''}
                      onChange={e => { e.stopPropagation(); onUpdate({ specs: { ...specs, [field]: e.target.value } }) }}
                      onClick={e => e.stopPropagation()}
                      className="w-full text-xs border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800"
                    >
                      <option value="">— select —</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Delete button */}
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="w-full py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={12} strokeWidth={1.5} /> Remove detection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Client Modal ─────────────────────────────────────────────────────────────
function ClientModal({ clients, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [adding, setAdding] = useState(false)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleAddNew = async () => {
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, company: newCompany }),
    })
    const data = await res.json()
    onSelect({ id: data.id, name: newName, company: newCompany })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-96 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-white/5">
          <h3 className="font-semibold">Assign Client</h3>
          <input
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm bg-transparent focus:outline-none focus:border-[#0A84FF]"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} onClick={() => onSelect(c)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-white/5">
              <p className="text-sm font-medium">{c.name}</p>
              {c.company && <p className="text-xs text-gray-400">{c.company}</p>}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Add new client</p>
          <input
            placeholder="Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm bg-transparent focus:outline-none focus:border-[#0A84FF]"
          />
          <input
            placeholder="Company (optional)"
            value={newCompany}
            onChange={e => setNewCompany(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm bg-transparent focus:outline-none focus:border-[#0A84FF]"
          />
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleAddNew} disabled={!newName.trim() || adding}
              className="flex-1 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0070d6] disabled:opacity-40 transition-colors">
              {adding ? 'Adding…' : 'Add & Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


