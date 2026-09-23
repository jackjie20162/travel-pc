/**
 * 统一货币 / 价格格式化工具（移植自 travel-app/src/utils/currency.js）
 *
 * 设计要点：
 * - 后端价格以基准币 AED 存储，单位为「元」（int64，不除 100）。
 * - 前端根据用户所选展示币种，用汇率把基准金额换算后格式化显示。
 * - 汇率来源：优先后端 /api/travel/currencies/rates；未就绪时使用内置静态汇率回退。
 * - 金额统一使用拉丁数字，保证可读一致。
 */
import { ref, computed } from 'vue'

export const BASE_CURRENCY = 'AED'

const STORAGE_CURRENCY = 'travel_currency'

/** 内置静态汇率回退（相对基准币 AED），后端接口就绪前的兜底。 */
const FALLBACK_RATES = {
  AED: 1,
  USD: 0.2723, // 1 AED ≈ 0.2723 USD
  CNY: 1.96,   // 1 AED ≈ 1.96 CNY
}

/** 币种元信息回退（后端 /currencies 就绪前使用）。 */
const FALLBACK_CURRENCIES = [
  { code: 'AED', symbol: 'د.إ', decimals: 2, symbolPosition: 'suffix', isBase: true },
  { code: 'USD', symbol: '$', decimals: 2, symbolPosition: 'prefix', isBase: false },
  { code: 'CNY', symbol: '¥', decimals: 2, symbolPosition: 'prefix', isBase: false },
]

// 模块级响应式单例（跨组件共享）
export const selectedCurrency = ref(localStorage.getItem(STORAGE_CURRENCY) || BASE_CURRENCY)
const rates = ref({ ...FALLBACK_RATES })
export const currencies = ref([...FALLBACK_CURRENCIES])
const loaded = ref(false)

/** 汇率放大因子：后端以 rate_micro(×1e6) 传输时用于还原。 */
const RATE_SCALE = 1e6

export function getSelectedCurrency() {
  return selectedCurrency.value
}

export function setSelectedCurrency(code) {
  if (!code) return
  selectedCurrency.value = code
  localStorage.setItem(STORAGE_CURRENCY, code)
}

export function getCurrencyMeta(code) {
  return currencies.value.find(c => c.code === code) || { code, symbol: code, decimals: 2, symbolPosition: 'prefix' }
}

/** 用后端数据刷新币种字典与汇率（rates 支持 {code:rate} 或 [{targetCurrency,rate|rateMicro}]）。 */
export function applyCurrencyData({ currencies: list, rates: rateData } = {}) {
  if (Array.isArray(list) && list.length) {
    currencies.value = list.map(c => ({
      code: c.code,
      symbol: c.symbol || c.code,
      decimals: c.decimals != null ? c.decimals : 2,
      symbolPosition: c.symbolPosition || 'prefix',
      isBase: !!c.isBase,
    }))
  }
  if (rateData) {
    const next = { [BASE_CURRENCY]: 1 }
    if (Array.isArray(rateData)) {
      for (const r of rateData) {
        const code = r.targetCurrency || r.code
        if (!code) continue
        const raw = r.rateMicro != null ? Number(r.rateMicro) / RATE_SCALE : Number(r.rate)
        if (!Number.isNaN(raw) && raw > 0) next[code] = raw
      }
    } else if (typeof rateData === 'object') {
      for (const [code, val] of Object.entries(rateData)) {
        const raw = Number(val)
        if (!Number.isNaN(raw) && raw > 0) next[code] = raw
      }
    }
    rates.value = next
  }
  loaded.value = true
}

export function isLoaded() {
  return loaded.value
}

/**
 * 把「以 from 币种存储的金额」换算为 targetCode 币种金额。
 * rates 均以基准币(AED)为参照，需先折回基准币再换算：value = amount / rate[from] * rate[to]。
 */
export function convert(amount, targetCode = selectedCurrency.value, fromCode = BASE_CURRENCY) {
  const amt = Number(amount)
  if (Number.isNaN(amt)) return 0
  const rateTo = rates.value[targetCode] ?? rates.value[BASE_CURRENCY] ?? 1
  const rateFrom = rates.value[fromCode] ?? rates.value[BASE_CURRENCY] ?? 1
  const meta = getCurrencyMeta(targetCode)
  const factor = Math.pow(10, meta.decimals ?? 2)
  return Math.round((amt / rateFrom * rateTo) * factor) / factor
}

/**
 * 统一价格格式化：把「以 from 币种存储的金额」换算并按目标币种符号/小数位格式化。
 */
export function formatPrice(amountBase, opts = {}) {
  const currency = opts.currency || selectedCurrency.value
  const from = opts.from || BASE_CURRENCY
  if (amountBase == null || amountBase === '' || Number.isNaN(Number(amountBase))) return '--'
  const value = convert(amountBase, currency, from)
  if (value <= 0) return '--'
  const meta = getCurrencyMeta(currency)
  try {
    const nf = new Intl.NumberFormat('en-US-u-nu-latn', {
      minimumFractionDigits: meta.decimals ?? 2,
      maximumFractionDigits: meta.decimals ?? 2,
    })
    const num = nf.format(value)
    return meta.symbolPosition === 'suffix' ? `${meta.symbol}${num}` : `${meta.symbol}${num}`
  } catch {
    return `${meta.symbol}${value.toFixed(meta.decimals ?? 2)}`
  }
}

/**
 * 直接格式化「已确定的展示金额」（订单锁汇后的 displayAmount，不再换算）。
 */
export function formatAmount(amount, currency = selectedCurrency.value) {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return '--'
  const meta = getCurrencyMeta(currency)
  const value = Number(amount)
  try {
    const nf = new Intl.NumberFormat('en-US-u-nu-latn', {
      minimumFractionDigits: meta.decimals ?? 2,
      maximumFractionDigits: meta.decimals ?? 2,
    })
    const num = nf.format(value)
    return meta.symbolPosition === 'suffix' ? `${meta.symbol}${num}` : `${meta.symbol}${num}`
  } catch {
    return `${meta.symbol}${value.toFixed(meta.decimals ?? 2)}`
  }
}

export function useCurrency() {
  return {
    currency: selectedCurrency,
    currencyList: computed(() => currencies.value),
    setSelectedCurrency,
    convert,
    formatPrice,
    formatAmount,
  }
}
