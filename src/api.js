const STORAGE_TENANT = 'travel_tenant_id'
const STORAGE_MERCHANT = 'travel_merchant_id'
const STORAGE_TOKEN = 'travel_user_token'

const configuredBase = (import.meta.env.VITE_TRAVEL_API_BASE_URL || '').replace(/\/$/, '')
const baseUrl = configuredBase || ''

export function getTenantId() {
  return localStorage.getItem(STORAGE_TENANT) || '1'
}

export function getMerchantId() {
  return localStorage.getItem(STORAGE_MERCHANT) || '1'
}

export function getToken() {
  return localStorage.getItem(STORAGE_TOKEN) || ''
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': getTenantId(),
    'X-Merchant-ID': getMerchantId(),
    ...options.headers,
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  const data = await res.json()
  if (data != null && typeof data.code === 'number' && data.code !== 0 && data.msg) {
    throw new Error(data.msg)
  }
  return data
}

function pickList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.items)) return data.data.items
  return []
}

export async function getProducts({ keyword, destination, page = 1, pageSize = 24 } = {}) {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (destination) params.set('destination', destination)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  const data = await request(`/api/travel/products?${params}`)
  return {
    raw: data,
    items: pickList(data),
    total: data?.total || data?.data?.total || pickList(data).length,
  }
}

export function getProductDetail(id) {
  return request(`/api/travel/products/${id}`)
}

export async function getProductPackages(productId) {
  const data = await request(`/api/travel/products/${productId}/packages`)
  return pickList(data)
}

export async function getProductItineraryStops(productId) {
  const data = await request(`/api/travel/products/${productId}/itinerary-stops`)
  return pickList(data)
}

export async function batchInventory({ packageId, startDate, endDate }) {
  const params = new URLSearchParams({ startDate, endDate })
  const data = await request(`/api/travel/inventory/packages/${packageId}/batch?${params}`)
  return pickList(data)
}
