import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { initDb } from '@/lib/db'

export async function POST(req) {
  await initDb()
  await requireAuth(req)

  const { imageData } = await req.json()
  if (!imageData) return NextResponse.json({ error: 'imageData required' }, { status: 400 })

  const prompt = `You are analysing a door schedule page from a New Zealand building plan.

Extract ALL door entries from this door schedule table as a JSON array.

For each door, extract:
- mark: the door mark/reference (e.g. "D1", "1", "A")
- type: door type (e.g. "Single Prehung", "Double Prehung", "Cavity Slider", "Bi-fold", "Barn Slider", "Wardrobe Slider")
- width_mm: width in millimetres as a number (common: 600, 700, 760, 810, 860, 910)
- height_mm: height in millimetres as a number (common: 2040, 2100)
- quantity: number of doors (default 1 if not shown)
- handing: "Left Hand", "Right Hand", or "N/A" if not specified
- core: "Hollow Core", "Solid Core", or "Fire Rated" if mentioned
- finish: "Raw", "Primed", "Pre-finished White", or the finish description
- frame: "LJ&P Standard", "Rebate Only", "No Frame", or description
- notes: any additional notes

Common NZ abbreviations:
- SPH/PHD = Single Prehung, DPH = Double Prehung
- SCS/CS = Single Cavity Slider, DCS = Double Cavity Slider
- BFD/BF = Bi-fold Door, DBF = Double Bi-fold
- BWS/WS = Barn/Wall Slider, WR = Wardrobe
- HC = Hollow Core, SC = Solid Core, FD30 = Fire Door
- PR = Primed, PFW = Pre-finished White
- LJ = LJ&P Standard frame

Return ONLY valid JSON array, no markdown, no explanation:
[{"mark":"D1","type":"Single Prehung","width_mm":760,"height_mm":2040,"quantity":1,"handing":"Left Hand","core":"Hollow Core","finish":"Primed","frame":"LJ&P Standard","notes":""}]`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageData, detail: 'high' } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '[]'

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    const items = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return NextResponse.json({ items, raw: content })
  } catch (err) {
    console.error('Schedule extraction error:', err)
    return NextResponse.json({ error: 'Extraction failed', items: [] }, { status: 500 })
  }
}
