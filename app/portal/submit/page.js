'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'

export default function PortalSubmitPage() {
  const [mode, setMode] = useState('upload') // 'upload' | 'manual'
  const [uploadState, setUploadState] = useState('idle') // idle, uploading, selecting, submitted
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState([])
  const [selectedPage, setSelectedPage] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [planId, setPlanId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [manualForm, setManualForm] = useState({ jobName: '', address: '', notes: '', doors: [] })
  const router = useRouter()

  async function renderPDFPages(ab) {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise
      const imgs = []
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width; canvas.height = viewport.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        imgs.push({ pageNum: i, thumbnail: canvas.toDataURL('image/jpeg', 0.7) })
      }
      return imgs
    } catch {
      return [{ pageNum: 1, thumbnail: null }]
    }
  }

  const onDrop = useCallback(async (files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setUploadState('uploading')
    setUploadProgress(0)

    const interval = setInterval(() => setUploadProgress(p => Math.min(p + 12, 90)), 200)
    const ab = await f.arrayBuffer()
    const pagesP = renderPDFPages(ab.slice(0))

    const formData = new FormData()
    formData.append('file', f)
    const res = await fetch('/api/plans/upload', { method: 'POST', body: formData })
    const data = await res.json()
    clearInterval(interval)
    setUploadProgress(100)
    setPlanId(data.planId)

    const rendered = await pagesP
    setPages(rendered)
    setSelectedPage(rendered[0]?.pageNum)
    setTimeout(() => setUploadState('selecting'), 300)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  })

  async function handleSubmit() {
    setSubmitting(true)
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { planId, pageNum: selectedPage, filename: file?.name } }),
    })
    setUploadState('submitted')
    setSubmitting(false)
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: manualForm }),
    })
    setUploadState('submitted')
    setSubmitting(false)
  }

  if (uploadState === 'submitted') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[#34c759] flex items-center justify-center mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-3xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-2">Submitted!</h2>
        <p className="text-[#8e8e93] max-w-sm mb-8">Your floor plan has been received. We'll review it and send you a quote shortly.</p>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.01 }} onClick={() => router.push('/portal/quotes')} className="px-5 py-3 bg-[#0A84FF] text-white font-semibold rounded-xl">
            View Quotes
          </motion.button>
          <motion.button whileHover={{ scale: 1.01 }} onClick={() => { setUploadState('idle'); setFile(null); setPages([]) }} className="px-5 py-3 bg-gray-100 dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold rounded-xl">
            Submit Another
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Submit a Job</h1>

      {/* Mode tabs */}
      {uploadState === 'idle' && (
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl w-fit">
          <button
            onClick={() => setMode('upload')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'upload' ? 'bg-white dark:bg-zinc-700 text-[#1c1c1e] dark:text-[#f5f5f7] shadow-sm' : 'text-[#8e8e93]'}`}
          >
            Upload Floor Plan
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'manual' ? 'bg-white dark:bg-zinc-700 text-[#1c1c1e] dark:text-[#f5f5f7] shadow-sm' : 'text-[#8e8e93]'}`}
          >
            Fill Out Manually
          </button>
        </div>
      )}

      {mode === 'upload' && (
        <>
          {uploadState === 'idle' && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-[#0A84FF] bg-[#0A84FF]/5' : 'border-gray-200 dark:border-white/10 hover:border-[#0A84FF]/50'
              }`}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={{ y: isDragActive ? -4 : [0, -4, 0] }}
                transition={{ duration: 2, repeat: isDragActive ? 0 : Infinity }}
                className="w-14 h-14 rounded-2xl bg-[#0A84FF]/10 flex items-center justify-center mx-auto mb-4"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </motion.div>
              <h3 className="text-xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
                {isDragActive ? 'Drop to submit' : 'Drop your floor plan here'}
              </h3>
              <p className="text-[#8e8e93] text-sm">or click to browse — PDF files only</p>
            </div>
          )}

          {uploadState === 'uploading' && (
            <div className="border border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center">
              <p className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mb-4">{file?.name}</p>
              <div className="h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden mb-2">
                <motion.div className="h-full bg-[#0A84FF] rounded-full" animate={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-[#8e8e93]">Uploading {uploadProgress}%…</p>
            </div>
          )}

          {uploadState === 'selecting' && (
            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] mb-3">Select the floor plan page</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {pages.map(page => (
                    <button
                      key={page.pageNum}
                      onClick={() => setSelectedPage(page.pageNum)}
                      className={`relative flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden border-2 transition-all ${
                        selectedPage === page.pageNum ? 'border-[#0A84FF]' : 'border-gray-200 dark:border-white/10'
                      }`}
                    >
                      {page.thumbnail
                        ? <img src={page.thumbnail} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs text-[#8e8e93]">Page {page.pageNum}</div>
                      }
                      {selectedPage === page.pageNum && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#0A84FF] flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                onClick={handleSubmit}
                disabled={submitting || !selectedPage}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-black text-lg rounded-xl transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit for Analysis'}
              </motion.button>
            </div>
          )}
        </>
      )}

      {mode === 'manual' && uploadState === 'idle' && (
        <form onSubmit={handleManualSubmit} className="space-y-4 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          {[
            { key: 'jobName', label: 'Job Name', placeholder: 'e.g. 42 Smith Street, Remuera' },
            { key: 'address', label: 'Property Address', placeholder: 'Full address' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-1.5">{field.label}</label>
              <input
                value={manualForm[field.key]}
                onChange={e => setManualForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-1.5">Additional Notes</label>
            <textarea
              value={manualForm.notes}
              onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any specific requirements, door sizes, finishes…"
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none resize-none"
            />
          </div>
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-black rounded-xl transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Job'}
          </motion.button>
        </form>
      )}
    </motion.div>
  )
}
