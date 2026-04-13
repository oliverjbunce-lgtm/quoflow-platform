'use client'
import { useState } from 'react'
import { Upload, ScanLine, CheckSquare, FileText } from 'lucide-react'

const STEPS = [
  {
    icon: Upload,
    title: 'Upload a floor plan',
    body: 'Upload any floor plan PDF. Multi-page documents are supported — you can analyse each page independently.',
  },
  {
    icon: ScanLine,
    title: 'Select a page and analyse',
    body: 'Choose the floor plan page you want to analyse. Scroll to zoom in and inspect the plan before selecting. Then click Analyse.',
  },
  {
    icon: CheckSquare,
    title: 'Review AI detections',
    body: 'The AI identifies door types and marks them on the plan. You can correct any mistakes, add missed doors, or remove false detections.',
  },
  {
    icon: FileText,
    title: 'Generate a quote',
    body: 'Once detections look right, save to Plans and generate a PDF quote. Prices pull from your catalogue automatically.',
  },
  {
    icon: null,
    title: "You're ready to go",
    body: 'Upload your first floor plan to get started. You can revisit this tour anytime from Settings.',
    isFinal: true,
  },
]

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#0A84FF] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Icon */}
          {Icon && (
            <div className="w-14 h-14 rounded-2xl bg-[#0A84FF]/10 flex items-center justify-center mb-6">
              <Icon size={26} strokeWidth={1.5} className="text-[#0A84FF]" />
            </div>
          )}
          {current.isFinal && (
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="1.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}

          {/* Step counter */}
          <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">
            Step {step + 1} of {STEPS.length}
          </p>

          <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#1c1c1e] mb-3">
            {current.title}
          </h2>
          <p className="text-[#3c3c43] text-base leading-relaxed mb-8">
            {current.body}
          </p>

          {/* Dot indicators + nav */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === step ? 'w-5 h-2 bg-[#0A84FF]' : 'w-2 h-2 bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#3c3c43] hover:bg-gray-100 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step < STEPS.length - 1) {
                    setStep(s => s + 1)
                  } else {
                    onComplete()
                  }
                }}
                className="px-5 py-2 bg-[#0A84FF] text-white rounded-xl text-sm font-semibold hover:bg-[#0070e0] transition-colors"
              >
                {step < STEPS.length - 1 ? 'Next' : 'Get started'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
