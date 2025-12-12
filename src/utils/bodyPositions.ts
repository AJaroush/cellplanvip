// Body position configuration - flexible for any dataset
export const BODY_POSITIONS = [
  'Hand',
  'Hips', 
  'Torso',
  'Bag',
  'Pocket',
  'Backpack',
  'Arm',
  'Leg',
  'Head',
  'Other'
] as const

export const POSITION_COLORS: Record<string, string> = {
  'Hand': '#3b82f6',    // Blue
  'Hips': '#10b981',    // Green
  'Torso': '#f59e0b',   // Orange
  'Bag': '#ef4444',     // Red
  'Pocket': '#8b5cf6',   // Purple
  'Backpack': '#ec4899', // Pink
  'Arm': '#06b6d4',     // Cyan
  'Leg': '#84cc16',     // Lime
  'Head': '#f97316',    // Orange
  'Other': '#6b7280'    // Gray
}

export const POSITION_ICONS: Record<string, string> = {
  'Hand': '✋',
  'Hips': '👖',
  'Torso': '👕',
  'Bag': '🎒',
  'Pocket': '👔',
  'Backpack': '🎒',
  'Arm': '💪',
  'Leg': '🦵',
  'Head': '👤',
  'Other': '📍'
}

export function normalizePosition(position: string | undefined): string {
  if (!position) return 'Other'
  const normalized = position.trim()
  const lower = normalized.toLowerCase()
  
  // Exact matches first (case-insensitive)
  if (lower === 'hand') return 'Hand'
  if (lower === 'bag') return 'Bag'
  if (lower === 'hips' || lower === 'hip') return 'Hips'
  if (lower === 'torso') return 'Torso'
  if (lower === 'pocket') return 'Pocket'
  if (lower === 'backpack') return 'Backpack'
  if (lower === 'arm') return 'Arm'
  if (lower === 'leg') return 'Leg'
  if (lower === 'head') return 'Head'
  
  // Partial matches
  if (lower.includes('hand')) return 'Hand'
  if (lower.includes('bag')) return 'Bag'
  if (lower.includes('hip')) return 'Hips'
  if (lower.includes('torso')) return 'Torso'
  if (lower.includes('pocket')) return 'Pocket'
  if (lower.includes('backpack')) return 'Backpack'
  if (lower.includes('arm')) return 'Arm'
  if (lower.includes('leg')) return 'Leg'
  if (lower.includes('head')) return 'Head'
  
  // Capitalize first letter for display
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
}

export function getPositionColor(position: string): string {
  const normalized = normalizePosition(position)
  return POSITION_COLORS[normalized] || POSITION_COLORS['Other']
}

export function getPositionIcon(position: string): string {
  const normalized = normalizePosition(position)
  return POSITION_ICONS[normalized] || POSITION_ICONS['Other']
}

