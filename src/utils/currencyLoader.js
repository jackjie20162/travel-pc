/**
 * 启动时从后端加载币种字典与汇率，写入 currency store（移植自 travel-app）。
 * 接口未就绪或失败时静默回退到 currency.js 内置静态汇率，不阻塞 UI。
 */
import { getCurrencies, getExchangeRates } from '../api.js'
import { applyCurrencyData, BASE_CURRENCY } from './currency.js'

let loaded = false

export async function loadCurrencyData(force = false) {
  if (loaded && !force) return
  try {
    const [curResp, rateResp] = await Promise.all([
      getCurrencies().catch(() => null),
      getExchangeRates(BASE_CURRENCY).catch(() => null),
    ])
    const list = curResp?.items || curResp?.data?.items || (Array.isArray(curResp) ? curResp : null)
    const rates = rateResp?.items || rateResp?.data?.items || (Array.isArray(rateResp) ? rateResp : null)
    if (list || rates) {
      applyCurrencyData({ currencies: list || undefined, rates: rates || undefined })
    }
    loaded = true
  } catch (e) {
    console.warn('加载币种/汇率失败，使用内置静态汇率', e)
  }
}
