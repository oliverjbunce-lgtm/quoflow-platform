'use client'

export const DOOR_TYPES = [
  'L_prehung_door',
  'R_prehung_door',
  'Double_prehung_door',
  'S_cavity_slider',
  'Double_cavity_slider',
  'Bi_folding_door',
  'Double_bifold_door',
  'Wardrobe_sliding_two_doors_1',
  'Wardrobe_sliding_three_doors',
  'Barn_wall_slider',
  'Exterior_door',
  'Other',
]

export const DETECTION_COLOURS = {
  L_prehung_door: '#0A84FF',
  R_prehung_door: '#0A84FF',
  Double_prehung_door: '#FF9F0A',
  S_cavity_slider: '#30D158',
  Double_cavity_slider: '#30D158',
  Bi_folding_door: '#BF5AF2',
  Double_bifold_door: '#BF5AF2',
  Wardrobe_sliding_two_doors_1: '#FF375F',
  Wardrobe_sliding_three_doors: '#FF375F',
  Barn_wall_slider: '#64D2FF',
  Exterior_door: '#FF6B00',
  Other: '#8E8E93',
}

export function getColour(name) {
  return DETECTION_COLOURS[name] || '#8E8E93'
}
