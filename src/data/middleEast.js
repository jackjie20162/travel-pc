/**
 * 目的地 / 主题 / 信任项静态数据。
 *
 * 多语言说明：展示文案（名称、标语、主题名、信任项）统一走 i18n，
 * 这里只保留结构化标识（slug、查询词、图标、图片、国家名等）。
 * - 目的地名称/标语：t(`pc.dest.${slug}.name`) / t(`pc.dest.${slug}.headline`)
 * - 主题名称：t(`pc.themes.${key}`)
 * - 信任项：t(`pc.trust.${key}`)
 */
export const destinations = [
  {
    slug: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'abu-dhabi',
    name: 'Abu Dhabi',
    country: 'United Arab Emirates',
    image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'doha',
    name: 'Doha',
    country: 'Qatar',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'riyadh',
    name: 'Riyadh',
    country: 'Saudi Arabia',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
  },
]

export const themes = [
  { key: 'desert', query: 'desert', icon: '⌁' },
  { key: 'tower', query: 'tower', icon: '⌂' },
  { key: 'marina', query: 'marina', icon: '≈' },
  { key: 'culture', query: 'culture', icon: '◇' },
  { key: 'family', query: 'family', icon: '◎' },
  { key: 'food', query: 'food', icon: '◐' },
]

export const trustKeys = ['inventory', 'supplier', 'support', 'voucher']

export function destinationBySlug(slug) {
  return destinations.find((item) => item.slug === slug) || destinations[0]
}
