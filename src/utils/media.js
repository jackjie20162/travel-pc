/**
 * 媒体 URL 统一解析
 *
 * 本地存储模式下上传服务返回相对路径（如 /uploads/images/xxx.png），
 * C 端应用与 merchant-upload-api 不同源，直接渲染会 404。
 * 这里检测：相对路径视为本地存储，补上 VITE_UPLOAD_BASE_URL 指向的上传服务地址；
 * OSS 等绝对 URL（http/https/协议相对/data:/blob:）原样返回。
 */
const UPLOAD_BASE = (import.meta.env.VITE_UPLOAD_BASE_URL || '').replace(/\/+$/, '')

export function resolveMediaUrl(url) {
  if (!url) return ''
  const str = String(url).trim()
  if (!str) return ''
  // 绝对地址（OSS / CDN / 协议相对 / data / blob）原样使用
  if (/^(https?:)?\/\//i.test(str) || /^(data|blob):/i.test(str)) return str
  // 相对路径 = 本地存储模式，补上传服务地址；未配置 base 时交给 dev proxy
  if (!UPLOAD_BASE) return str
  return str.startsWith('/') ? UPLOAD_BASE + str : `${UPLOAD_BASE}/${str}`
}

export function resolveMediaList(list) {
  if (!Array.isArray(list)) return []
  return list.map(resolveMediaUrl).filter(Boolean)
}
