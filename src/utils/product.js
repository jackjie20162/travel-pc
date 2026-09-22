import { resolveMediaUrl } from './media.js'

export function productTitle(product) {
  return product?.title || product?.name || '中东精选体验'
}

export function productDestination(product) {
  return product?.destination || product?.city || 'Dubai'
}

export function productDescription(product) {
  return product?.description || product?.summary || '精选中东目的地体验，适合自由行、家庭出游和商务休闲行程。'
}

export function productCover(product, fallback) {
  return resolveMediaUrl(product?.coverImage || product?.cover_image || firstImage(product?.images)) || fallback
}

export function productPrice(product) {
  const value = product?.minPrice ?? product?.min_price ?? product?.price
  return Number(value || 0)
}

export function productCurrency(product) {
  return product?.currency || 'AED'
}

export function formatPrice(value) {
  const numeric = Number(value || 0)
  if (!numeric) return '--'
  return numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function firstImage(images) {
  if (!images) return ''
  if (Array.isArray(images)) return images.find(Boolean) || ''
  return String(images)
    .split(',')
    .map((item) => item.trim())
    .find(Boolean) || ''
}

function normalizeMediaItem(item) {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') return item.url || item.text || ''
  return ''
}

export function splitCsv(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(normalizeMediaItem).filter(Boolean)
  const str = String(value).trim()
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) return parsed.map(normalizeMediaItem).filter(Boolean)
    } catch (error) {
      // 落回逗号解析
    }
  }
  return str
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function productVideo(product) {
  return resolveMediaUrl(product?.videoUrl || product?.video_url || '')
}
