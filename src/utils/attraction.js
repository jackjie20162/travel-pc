/**
 * 景点字段解析工具：名称本地化 / 封面 / 图集 / 标签 / 分类
 * 后端 cover_image、images 走本地上传服务相对路径，需经 resolveMediaUrl 补全。
 */
import { resolveMediaUrl } from './media.js'
import { splitCsv } from './product.js'

/** 景点名称：非中文语言优先展示英文名。 */
export function attractionTitle(attraction, locale) {
  if (!attraction) return ''
  if (locale && locale !== 'zh-CN' && attraction.nameEn) return attraction.nameEn
  return attraction.name || attraction.nameEn || ''
}

export function attractionCover(attraction, fallback = '') {
  const first = splitCsv(attraction?.images)[0] || ''
  return resolveMediaUrl(attraction?.coverImage || first) || fallback
}

/** 图片集（已解析为可访问 URL 数组）。 */
export function attractionImages(attraction) {
  return splitCsv(attraction?.images).map(resolveMediaUrl).filter(Boolean)
}

/** 标签数组（存储为 JSON 数组或逗号分隔）。 */
export function attractionTags(attraction) {
  return splitCsv(attraction?.tags)
}

/** 有真实坐标才可跳转地图。 */
export function attractionCoords(attraction) {
  const lat = Number(attraction?.latitude)
  const lng = Number(attraction?.longitude)
  if (!lat || !lng) return ''
  return `${lat},${lng}`
}
