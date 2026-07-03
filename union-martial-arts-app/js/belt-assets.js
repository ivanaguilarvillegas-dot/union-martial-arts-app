const BELT_MAP = new Map([
  ['blanca', 'belt-white.png'],
  ['amarilla', 'belt-yellow.png'],
  ['naranja', 'belt-orange.png'],
  ['anaranjada', 'belt-orange.png'],
  ['morada', 'belt-purple.png'],
  ['azul', 'belt-blue.png'],
  ['verde', 'belt-green.png'],
  ['cafe i', 'belt-brown-1.png'],
  ['cafe ii', 'belt-brown-2.png'],
  ['cafe iii', 'belt-brown-3.png'],
  ['roja', 'belt-red.png'],
  ['roja negra', 'belt-red-black.png'],
  ['negra', 'belt-black.png'],
  ['negra i grado', 'belt-black-1.png'],
  ['negra i', 'belt-black-1.png'],
  ['negra ii grado', 'belt-black-2.png'],
  ['negra ii', 'belt-black-2.png'],
  ['negra iii grado', 'belt-black-3.png'],
  ['negra iii', 'belt-black-3.png'],
  ['negra iv grado', 'belt-black-4.png'],
  ['negra iv', 'belt-black-4.png'],
  ['negra v grado', 'belt-black-5.png'],
  ['negra v', 'belt-black-5.png']
])

export function normalizeBeltName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getBeltAssetFileName(beltName) {
  const key = normalizeBeltName(beltName)
  if (!key) return null

  const direct = BELT_MAP.get(key)
  if (direct) return direct

  // Handles alternate spacing variants like "roja/negra" after normalization.
  const compact = key.replace(/\s+/g, ' ')
  if (compact === 'roja negra') return 'belt-red-black.png'

  return null
}

export function getBeltImagePath(beltName) {
  const fileName = getBeltAssetFileName(beltName)
  if (!fileName) return null
  return `assets/belts/${fileName}`
}
