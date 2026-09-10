export const destinations = [
  {
    slug: 'dubai',
    name: 'Dubai',
    zhName: '迪拜',
    country: 'United Arab Emirates',
    headline: '沙漠、天际线与海湾夜色',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
    tags: ['沙漠冲沙', '哈利法塔', '游艇', '亲子'],
  },
  {
    slug: 'abu-dhabi',
    name: 'Abu Dhabi',
    zhName: '阿布扎比',
    country: 'United Arab Emirates',
    headline: '清真寺、卢浮宫与法拉利世界',
    image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
    tags: ['城市一日游', '文化建筑', '主题乐园'],
  },
  {
    slug: 'doha',
    name: 'Doha',
    zhName: '多哈',
    country: 'Qatar',
    headline: '海滨城市、博物馆与沙丘营地',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    tags: ['博物馆', '海滨', '沙漠'],
  },
  {
    slug: 'riyadh',
    name: 'Riyadh',
    zhName: '利雅得',
    country: 'Saudi Arabia',
    headline: '新中东城市与纳季德文化',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    tags: ['城市观光', '文化', '美食'],
  },
]

export const themes = [
  { name: '沙漠冒险', query: 'desert', icon: '⌁' },
  { name: '城市地标', query: 'tower', icon: '⌂' },
  { name: '游艇与海湾', query: 'marina', icon: '≈' },
  { name: '文化建筑', query: 'culture', icon: '◇' },
  { name: '亲子乐园', query: 'family', icon: '◎' },
  { name: '美食夜游', query: 'food', icon: '◐' },
]

export const trustItems = [
  '真实库存与价格',
  '本地供应商履约',
  '多语言客服支持',
  '订单凭证在线管理',
]

export function destinationBySlug(slug) {
  return destinations.find((item) => item.slug === slug) || destinations[0]
}
