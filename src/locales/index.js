/**
 * vue-i18n 初始化 + 语言持久化 + RTL 方向切换（travel-pc）
 *
 * 支持三种语言：简体中文(zh-CN)、英文(en-US)、阿拉伯语(ar，RTL)。
 * 语言选择持久化到 localStorage('travel_pc_locale')；切换时同步 <html lang/dir>。
 */
import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.js'
import enUS from './en-US.js'
import ar from './ar.js'

export const STORAGE_LOCALE = 'travel_pc_locale'
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US', 'ar']
export const DEFAULT_LOCALE = 'en-US'

/** locale → Intl 数字/货币格式化所用 locale。 */
export const INTL_LOCALE_MAP = {
  'zh-CN': 'zh-CN',
  'en-US': 'en-US',
  'ar': 'ar',
}

/** locale → 显示名（用于语言切换器）。 */
export const LOCALE_LABELS = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'ar': 'العربية',
}

/** 需要 RTL 布局的语言。 */
const RTL_LOCALES = new Set(['ar'])

function detectInitialLocale() {
  const saved = localStorage.getItem(STORAGE_LOCALE)
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved
  const nav = (navigator.language || '').replace('_', '-')
  if (nav.startsWith('zh')) return 'zh-CN'
  if (nav.startsWith('ar')) return 'ar'
  if (nav.startsWith('en')) return 'en-US'
  return DEFAULT_LOCALE
}

export function isRtl(locale) {
  return RTL_LOCALES.has(locale)
}

/** 应用语言到 <html>（lang + dir），供 RTL 布局使用。 */
export function applyDocumentLocale(locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ar': ar,
  },
})

// 初始化文档方向
applyDocumentLocale(i18n.global.locale.value)

/** 全局设置语言：更新 i18n、持久化、同步 <html>。 */
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_LOCALE, locale)
  applyDocumentLocale(locale)
}

/** 当前用于 Intl 格式化的 locale。 */
export function currentIntlLocale() {
  return INTL_LOCALE_MAP[i18n.global.locale.value] || 'en-US'
}

export default i18n
