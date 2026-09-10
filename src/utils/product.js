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
  return product?.coverImage || product?.cover_image || firstImage(product?.images) || fallback
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

export function splitCsv(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
