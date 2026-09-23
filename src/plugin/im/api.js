// 旅行 PC 端 IM：客户身份解析、WebSocket 接入地址与消息内容构造
// 客户以 user_type=3 接入，biz_uid 取登录用户 id；咨询对象为商户客服（user_type=2）。
// 与 travel-app/src/plugin/im/api.js 对齐，新增订单卡片（contentType=4）。
import { getMerchantId, getStoredUser } from '../../api.js'
import { useUser } from '../../composables/user.js'

// IM 用户身份类型（与 im-common/constant 保持一致）
export const IM_USER_TYPE = {
  ADMIN: 1,
  MERCHANT: 2,
  CLIENT: 3,
}

// IM 内容类型（1文本 2图片 3商品卡片 4订单卡片，与后端 imnotify.OrderCard 约定一致）
export const CONTENT_TYPE = { TEXT: 1, IMAGE: 2, PRODUCT: 3, ORDER: 4 }

// 客户 IM 身份：user_type=3，biz_uid 取当前登录用户 id
export function getImIdentity() {
  const { currentUser } = useUser()
  const id = currentUser.value?.id ?? getStoredUser()?.id ?? 0
  return { userType: IM_USER_TYPE.CLIENT, bizUid: Number(id) }
}

// 咨询对象：商户客服，biz_uid 取当前商户 ID
export function getSupportTarget() {
  return { toType: IM_USER_TYPE.MERCHANT, toBizUid: Number(getMerchantId() || 0) }
}

// IM 网关 WebSocket 基址（默认本地 9281，生产用 VITE_IM_WS_URL 覆盖）
export function getImWsBase() {
  return import.meta.env.VITE_IM_WS_URL || 'ws://127.0.0.1:9281/ws'
}

// 拼接鉴权 query：浏览器 WebSocket 无法自定义 Header，用 query 传身份
export function buildImWsUrl() {
  const { userType, bizUid } = getImIdentity()
  const base = getImWsBase()
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}user_type=${userType}&biz_uid=${bizUid}`
}

// 归一化会话对象：后端 snake_case -> 前端 camelCase
export function normalizeSession(s) {
  return {
    sessionId: s.session_id,
    peerImUid: String(s.peer_im_uid || ''),
    peerType: s.peer_type,
    peerBizUid: s.peer_biz_uid,
    lastContent: s.last_content || '',
    lastSeq: s.last_seq || 0,
    lastTime: s.last_time || 0,
    unread: s.unread || 0,
    lastContentType: s.last_content_type || 1,
  }
}

// IM 网关 HTTP 基址：优先 VITE_IM_API_URL，否则从 WS 基址推导（ws->http，去掉 /ws）
export function getImHttpBase() {
  if (import.meta.env.VITE_IM_API_URL) {
    return String(import.meta.env.VITE_IM_API_URL).replace(/\/$/, '')
  }
  return getImWsBase().replace(/^ws/, 'http').replace(/\/ws\/?$/, '')
}

// 上传图片到 IM 网关，返回可访问 URL
export async function uploadImage(file) {
  const fd = new FormData()
  fd.append('file', file)
  const resp = await fetch(`${getImHttpBase()}/im/upload`, { method: 'POST', body: fd })
  if (!resp.ok) throw new Error('图片上传失败')
  const json = await resp.json()
  if (json.code !== 0) throw new Error(json.msg || '图片上传失败')
  return json.data.url
}

// 构造商品卡片消息 content（JSON 字符串）
export function buildProductContent(p) {
  const cover = p.coverImage || (p.images ? String(p.images).split(',')[0].trim() : '') || ''
  return JSON.stringify({
    productId: p.id,
    name: p.title || p.name || '',
    cover,
    price: p.minPrice != null ? String(p.minPrice) : '',
    destination: p.destination || '',
  })
}

// 解析商品卡片消息 content，失败返回 null
export function parseProductContent(content) {
  try {
    const o = JSON.parse(content)
    return o && typeof o === 'object' ? o : null
  } catch {
    return null
  }
}

// 构造订单卡片消息 content；核心字段与后端 imnotify.OrderCard 对齐，
// quantity/productId 为前端附加展示字段（商户端有则显示）
export function buildOrderContent(order) {
  return JSON.stringify({
    orderNo: order.orderNo || '',
    title: order.productTitle || order.productName || order.title || '',
    package: order.packageName || order.package || '',
    date: order.date || order.serviceDate || '',
    quantity: order.quantity != null ? Number(order.quantity) : undefined,
    amount: order.totalAmount != null ? Number(order.totalAmount) : (order.amount != null ? Number(order.amount) : 0),
    currency: order.currency || '',
    status: order.status || '',
    productId: order.productId || undefined,
  })
}

// 解析订单卡片消息 content，失败返回 null
export function parseOrderContent(content) {
  try {
    const o = JSON.parse(content)
    return o && typeof o === 'object' && o.orderNo ? o : null
  } catch {
    return null
  }
}

// 时钟格式 HH:mm（与 app plugin/im/format.js 对齐）
export function formatClock(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
