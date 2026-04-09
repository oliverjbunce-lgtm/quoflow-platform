const HF_BASE = process.env.HF_API_URL || 'https://oliverbunce-id-plan-analyser-api.hf.space'

/**
 * Analyse a floor plan PDF page via HF Space API.
 * @param {Buffer} pdfBuffer - Raw PDF file bytes
 * @param {number} pageNum - Page number to analyse (1-indexed)
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
      return { success: false, detections: getMockDetections(), mock: true }
    }

    const data = await res.json()

    const imageW = data.image_width || 1
    const imageH = data.image_height || 1

    // Parse detections — normalise bboxes to 0-1 relative to the image the API analysed
    const detections = (data.detections || data.boxes || []).map((d, i) => {
      let x1, y1, x2, y2

      // Handle various bbox formats the API might return
      if (d.box) {
        // {box: {x1,y1,x2,y2}} or {box: [x1,y1,x2,y2]}
        const b = d.box
        if (Array.isArray(b)) { [x1, y1, x2, y2] = b }
        else { x1 = b.x1; y1 = b.y1; x2 = b.x2; y2 = b.y2 }
      } else if (d.bbox) {
        const b = d.bbox
        if (Array.isArray(b)) { [x1, y1, x2, y2] = b }
        else { x1 = b.x1; y1 = b.y1; x2 = b.x2; y2 = b.y2 }
      } else if (d.xyxy) {
        [x1, y1, x2, y2] = d.xyxy
      } else if (Array.isArray(d) && d.length >= 4) {
        [x1, y1, x2, y2] = d
      }

      // If coords are already normalised (0-1), leave them; otherwise normalise
      const isNorm = x1 != null && x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1
      if (!isNorm && x1 != null) {
        x1 /= imageW; y1 /= imageH; x2 /= imageW; y2 /= imageH
      }

      return {
        id: `det-${i}`,
        class_name: d.class_name || d.label || d.name || d.class || 'Unknown',
        confidence: d.confidence || d.score || d.conf || 0.9,
        bbox: (x1 != null) ? [x1, y1, x2, y2] : null,
      }
    })

    console.log(`HF API success: ${detections.length} detections on page ${pageNum} (image ${imageW}×${imageH})`)
    return { success: true, detections, raw: data }

  } catch (err) {
    console.error('HF API call failed:', err.message)
    return { success: false, detections: getMockDetections(), mock: true }
  }
}

// Legacy export for any code still importing analyseFloorPlan
export async function analyseFloorPlan(imageBase64) {
  console.warn('analyseFloorPlan(base64) called — use analyseFloorPlanPDF(buffer) instead')
  return { success: false, detections: getMockDetections(), mock: true }
}

function getMockDetections() {
  const types = [
    'L_prehung_door', 'R_prehung_door', 'S_cavity_slider',
    'Double_prehung_door', 'Bi_folding_door', 'Wardrobe_sliding_two_doors_1',
    'Wardrobe_sliding_three_doors', 'Barn_wall_slider',
  ]
  const count = 6 + Math.floor(Math.random() * 8)
  return Array.from({ length: count }, (_, i) => {
    const x1 = 0.05 + Math.random() * 0.6
    const y1 = 0.05 + Math.random() * 0.6
    const w = 0.04 + Math.random() * 0.1
    const h = 0.04 + Math.random() * 0.1
    return {
      id: `mock-${i}`,
      class_name: types[Math.floor(Math.random() * types.length)],
      confidence: 0.75 + Math.random() * 0.24,
      bbox: [x1, y1, Math.min(x1 + w, 0.98), Math.min(y1 + h, 0.98)],
    }
  })
}
