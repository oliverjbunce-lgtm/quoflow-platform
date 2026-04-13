const HF_BASE = process.env.HF_API_URL || 'https://oliverbunce-id-plan-analyser-api.hf.space'

/**
 * Analyse a floor plan PDF page via HF Space API.
 *
 * HF API response format (confirmed):
 *   detections: [{class, count}]  ← summary only, NO bboxes
 *   boxes: [{id, class, class_id, confidence, x1, y1, x2, y2}]  ← individual boxes, coords already 0-1 normalised
 *   image_width, image_height: dims of the rendered page
 *
 * @param {Buffer} pdfBuffer - Raw PDF file bytes
 * @param {number} pageNum - Page number (1-indexed)
 */
export async function analyseFloorPlanPDF(pdfBuffer, pageNum = 1) {
  try {
    const formData = new FormData()
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    formData.append('file', blob, 'plan.pdf')
    formData.append('page', String(pageNum))

    const res = await fetch(`${HF_BASE}/analyse`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('HF API error:', res.status, err.slice(0, 200))
      return { success: false, error: 'Analysis failed' }
    }

    const data = await res.json()
    const imageW = data.image_width || 1
    const imageH = data.image_height || 1

    // Use 'boxes' — these have individual bbox coords (x1,y1,x2,y2) already normalised 0-1
    // 'detections' is a class-count summary only (no bbox data)
    const rawBoxes = data.boxes || []

    const detections = rawBoxes.map((d, i) => ({
      id: `det-${i}`,
      class_name: d.class || d.class_name || d.label || 'Unknown',
      confidence: d.confidence || d.conf || d.score || 0.9,
      // Coords are already 0-1 normalised — store as array [x1,y1,x2,y2]
      bbox: (d.x1 != null) ? [d.x1, d.y1, d.x2, d.y2] : null,
    }))

    console.log(`HF API success: ${detections.length} detections on page ${pageNum} (image ${imageW}x${imageH})`)
    return { success: true, detections, raw: data }

  } catch (err) {
    console.error('HF API call failed:', err.message)
    return { success: false, error: 'Analysis failed' }
  }
}
