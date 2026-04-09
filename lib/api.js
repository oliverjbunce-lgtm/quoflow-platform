const HF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://oliverbunce-id-plan-analyser-api.hf.space'

export async function analyseFloorPlan(imageBase64) {
  // Strip data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')

  // Try multiple endpoint patterns
  const endpoints = [
    { url: `${HF_BASE}/run/predict`, body: { data: [imageBase64] } },
    { url: `${HF_BASE}/api/predict`, body: { data: [imageBase64] } },
    { url: `${HF_BASE}/predict`, body: { image: base64Data } },
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint.body),
        signal: AbortSignal.timeout(60000),
      })

      if (res.ok) {
        const data = await res.json()
        const detections = parseHFResponse(data)
        if (detections && detections.length >= 0) {
          return { success: true, detections, raw: data }
        }
      }
    } catch (err) {
      console.warn(`HF endpoint ${endpoint.url} failed:`, err.message)
    }
  }

  // Fallback: return mock detections
  console.warn('All HF endpoints failed, using mock detections')
  return { success: false, detections: getMockDetections(), mock: true }
}

function parseHFResponse(data) {
  try {
    // Handle Gradio response format
    if (data.data && Array.isArray(data.data)) {
      const result = data.data[0]
      if (Array.isArray(result)) {
        return result.map((d, i) => ({
          id: `det-${i}`,
          class_name: d.label || d.class || d[4] || 'Unknown',
          confidence: d.confidence || d.score || d[5] || 0.9,
          bbox: d.bbox || d.box || { x1: d[0], y1: d[1], x2: d[2], y2: d[3] },
        }))
      }
      if (typeof result === 'object' && result.detections) {
        return result.detections
      }
    }
    // Handle direct array response
    if (Array.isArray(data)) {
      return data.map((d, i) => ({
        id: `det-${i}`,
        class_name: d.label || d.class_name || d.name || 'Unknown',
        confidence: d.confidence || d.score || 0.9,
        bbox: d.bbox || d.box || null,
      }))
    }
    return null
  } catch {
    return null
  }
}

function getMockDetections() {
  const types = [
    'L_prehung_door', 'R_prehung_door', 'S_cavity_slider',
    'Double_prehung_door', 'Bi_folding_door', 'Wardrobe_sliding_two_doors_1',
    'Wardrobe_sliding_three_doors', 'Barn_wall_slider',
  ]
  const count = 8 + Math.floor(Math.random() * 12)
  return Array.from({ length: count }, (_, i) => {
    const x1 = Math.random() * 0.6
    const y1 = Math.random() * 0.6
    const w = 0.05 + Math.random() * 0.15
    const h = 0.05 + Math.random() * 0.15
    return {
      id: `mock-${i}`,
      class_name: types[Math.floor(Math.random() * types.length)],
      confidence: 0.75 + Math.random() * 0.24,
      bbox: [x1, y1, x1 + w, y1 + h],
    }
  })
}
