// Config constants — NOT demo data

export const DETECTION_COLOURS = {
  L_prehung_door: '#0A84FF',
  R_prehung_door: '#0A84FF',
  Double_prehung_door: '#ec4899',
  S_cavity_slider: '#16a34a',
  D_cavity_slider: '#16a34a',
  Bi_folding_door: '#9333ea',
  D_bi_folding_door: '#9333ea',
  Barn_wall_slider: '#f97316',
  Wardrobe_sliding_two_doors_1: '#f59e0b',
  Wardrobe_sliding_two_doors_2: '#f59e0b',
  Wardrobe_sliding_three_doors: '#ef4444',
  Wardrobe_sliding_four_doors: '#ef4444',
}

export const DETECTION_LABELS = {
  L_prehung_door: 'L Prehung Door',
  R_prehung_door: 'R Prehung Door',
  Double_prehung_door: 'Double Prehung Door',
  S_cavity_slider: 'Single Cavity Slider',
  D_cavity_slider: 'Double Cavity Slider',
  Bi_folding_door: 'Bi-Folding Door',
  D_bi_folding_door: 'Double Bi-Folding Door',
  Barn_wall_slider: 'Barn Wall Slider',
  Wardrobe_sliding_two_doors_1: 'Wardrobe 2-Door',
  Wardrobe_sliding_two_doors_2: 'Wardrobe 2-Door',
  Wardrobe_sliding_three_doors: 'Wardrobe 3-Door',
  Wardrobe_sliding_four_doors: 'Wardrobe 4-Door',
}

export const DEFAULT_UNIT_PRICES = {
  'L Prehung Door': 285,
  'R Prehung Door': 285,
  'Double Prehung Door': 520,
  'Single Cavity Slider': 420,
  'Double Cavity Slider': 680,
  'Bi-Folding Door': 680,
  'Double Bi-Folding Door': 980,
  'Barn Wall Slider': 590,
  'Wardrobe 2-Door': 340,
  'Wardrobe 3-Door': 480,
  'Wardrobe 4-Door': 620,
}

export const STATUS_COLOURS = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  sent: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  accepted: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  declined: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  processing: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  shipped: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  delivered: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
}

// Empty arrays (no mock data)
export const MOCK_QUOTES = []
export const MOCK_ACTIVITY = []
