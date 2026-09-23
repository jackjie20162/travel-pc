/**
 * Travel PC API 封装层（与 travel-app/src/api.js 对齐）
 *
 * 对应 travel-api REST 端点：商品、库存、订单、支付、用户认证、评价。
 * 所有请求自动注入：
 * - X-Tenant-ID / X-Merchant-ID：租户上下文（localStorage 可覆盖，默认 1）
 * - Accept-Language：驱动后端错误/内容本地化（PC 默认 zh-CN）
 * - X-Display-Currency：下单锁汇的展示币种
 * - Authorization: Bearer <token>：登录后携带
 */

const STORAGE_TENANT = 'travel_tenant_id'
const STORAGE_MERCHANT = 'travel_merchant_id'
const STORAGE_TOKEN = 'travel_user_token'
const STORAGE_USER = 'travel_user_info'
const STORAGE_LOCALE = 'travel_locale'
const STORAGE_CURRENCY = 'travel_currency'

// 统一使用相对路径：开发环境由 vite proxy 转发（/api -> travel-api），生产环境同源 nginx 反代，
// 避免跨域直连触发 CORS 预检失败（与 travel-app 一致）。
// 确需指向其他 origin 时单独设置 VITE_TRAVEL_API_ORIGIN。
const baseUrl = (import.meta.env.VITE_TRAVEL_API_ORIGIN || '').replace(/\/$/, '')

/** 租户/商户默认值可在构建时通过 VITE_TRAVEL_TENANT_ID / VITE_TRAVEL_MERCHANT_ID 指定（PC 站通常固定服务单一商户），localStorage 可覆盖 */
export function getTenantId() {
  return localStorage.getItem(STORAGE_TENANT) || import.meta.env.VITE_TRAVEL_TENANT_ID || '1'
}

export function getMerchantId() {
  return localStorage.getItem(STORAGE_MERCHANT) || import.meta.env.VITE_TRAVEL_MERCHANT_ID || '1'
}

export function getLocale() {
  return localStorage.getItem(STORAGE_LOCALE) || 'zh-CN'
}

export function getDisplayCurrency() {
  return localStorage.getItem(STORAGE_CURRENCY) || 'AED'
}

export function getToken() {
  return localStorage.getItem(STORAGE_TOKEN) || ''
}

export function setToken(token) {
  localStorage.setItem(STORAGE_TOKEN, token)
}

export function clearToken() {
  localStorage.removeItem(STORAGE_TOKEN)
  localStorage.removeItem(STORAGE_USER)
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  localStorage.setItem(STORAGE_USER, JSON.stringify(user))
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': getTenantId(),
    'X-Merchant-ID': getMerchantId(),
    'Accept-Language': getLocale(),
    'X-Display-Currency': getDisplayCurrency(),
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

/* ── 商品 / 库存 ── */

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

/** 批量查询某套餐日期范围内的库存（日历/日期条展示：date/unitPrice/currency/isOpen/capacity/reserved） */
export async function batchInventory({ packageId, startDate, endDate }) {
  const params = new URLSearchParams({ startDate, endDate })
  const data = await request(`/api/travel/inventory/packages/${packageId}/batch?${params}`)
  return pickList(data)
}

export function checkInventory({ packageId, date, timeSlot, quantity }) {
  return request('/api/travel/inventory/check', {
    method: 'POST',
    body: JSON.stringify({ packageId, date, timeSlot: timeSlot || '', quantity }),
  })
}

/* ── 货币 / 汇率 ── */

export function getCurrencies() {
  return request('/api/travel/currencies')
}

export function getExchangeRates(base = 'AED') {
  return request(`/api/travel/currencies/rates?base=${encodeURIComponent(base)}`)
}

/* ── 订单 ── */

export function createOrder(payload) {
  return request('/api/travel/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getOrder(orderNo) {
  return request(`/api/travel/orders/${orderNo}`)
}

export function getMyOrders({ status, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return request(`/api/travel/my/orders?${params}`)
}

export function cancelOrder(orderNo) {
  return request(`/api/travel/my/orders/${orderNo}/cancel`, {
    method: 'POST',
  })
}

export function requestRefund(orderNo, reason) {
  return request(`/api/travel/my/orders/${orderNo}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/* ── 评价 ── */

export function getProductReviews(productId, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return request(`/api/travel/products/${productId}/reviews?${params}`)
}

export function getOrderReview(orderNo) {
  return request(`/api/travel/my/orders/${orderNo}/review`)
}

export function createReview(payload) {
  return request('/api/travel/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* ── 支付 ── */

export function createPayment({ orderNo, provider, idempotencyKey }) {
  return request('/api/travel/payments', {
    method: 'POST',
    body: JSON.stringify({ orderNo, provider, idempotencyKey }),
  })
}

export function getPayment(paymentNo) {
  return request(`/api/travel/payments/${paymentNo}`)
}

/** PayPal 同步返回：透传 URL 查询参数给后端完成 capture */
export function capturePaypalPayment(queryString) {
  return request(`/api/travel/payments/paypal/return${queryString ? '?' + queryString : ''}`)
}

/** Stripe：创建 PaymentIntent，返回 clientSecret + publishableKey */
export function createStripeIntent({ orderNo, idempotencyKey }) {
  return request('/api/travel/payments/stripe/intent', {
    method: 'POST',
    body: JSON.stringify({ orderNo, provider: 'stripe', idempotencyKey }),
  })
}

/* ── 用户认证 ── */

export function getCaptcha() {
  return request('/api/travel/captcha')
}

export function sendEmailCode({ email, captchaId, captchaAnswer }) {
  return request('/api/travel/user/send-email-code', {
    method: 'POST',
    body: JSON.stringify({ email, captchaId, captchaAnswer }),
  })
}

export function register({ username, password, email, mobile, nickname, captchaId, captchaAnswer, emailCode }) {
  return request('/api/travel/user/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, email, mobile, nickname, captchaId, captchaAnswer, emailCode }),
  })
}

export function login({ email, captchaId, captchaAnswer, emailCode }) {
  return request('/api/travel/user/login', {
    method: 'POST',
    body: JSON.stringify({ email, captchaId, captchaAnswer, emailCode }),
  })
}

export function loginByMobile({ mobile, password }) {
  return request('/api/travel/user/login-mobile', {
    method: 'POST',
    body: JSON.stringify({ mobile, password }),
  })
}

export function getProfile() {
  return request('/api/travel/user/profile')
}

export function updateProfile(payload) {
  return request('/api/travel/user/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function logout() {
  clearToken()
}
