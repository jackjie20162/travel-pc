/**
 * 语言 + 货币统一 composable（travel-pc）
 *
 * 组件 import { useLocale } from '../composables/useLocale.js'
 * 即可获得：t（翻译）、te、locale/setLocale（语言切换）、
 * formatPrice（来源币种→展示币种换算格式化）、formatAmount（已锁定金额格式化）、
 * currency/setCurrency/currencyList（币种切换）。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale as applyLocale, SUPPORTED_LOCALES, LOCALE_LABELS, currentIntlLocale, isRtl } from '../locales/index.js'
import {
  selectedCurrency,
  currencies,
  setSelectedCurrency,
  convert,
  formatPrice as formatPriceUtil,
  formatAmount as formatAmountUtil,
} from '../utils/currency.js'

export function useLocale() {
  const { t, te, tm, locale } = useI18n()

  const rtl = computed(() => isRtl(locale.value))

  function setLocale(next) {
    applyLocale(next)
  }

  /** 金额（以 from 币种存储）→ 当前展示币种格式化（含换算）。 */
  function formatPrice(amountBase, from) {
    return formatPriceUtil(amountBase, {
      currency: selectedCurrency.value,
      from,
      locale: currentIntlLocale(),
    })
  }

  /** 已确定的展示金额（订单锁汇后）→ 格式化，不再换算。 */
  function formatAmount(amount, currency) {
    return formatAmountUtil(amount, currency || selectedCurrency.value)
  }

  return {
    t,
    te,
    tm,
    locale,
    setLocale,
    supportedLocales: SUPPORTED_LOCALES,
    localeLabels: LOCALE_LABELS,
    rtl,
    // currency
    currency: selectedCurrency,
    currencyList: currencies,
    setCurrency: setSelectedCurrency,
    convert,
    formatPrice,
    formatAmount,
  }
}
