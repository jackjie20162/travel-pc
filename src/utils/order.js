/**
 * 订单状态与金额展示工具（与 travel-app 状态机对齐）
 *
 * 状态流：PENDING_PAYMENT → PENDING_ACCEPTANCE（支付成功待接单）
 *        → PENDING_VERIFY（商户接单待核销）→ VERIFIED → COMPLETED
 * 分支：CANCELLED（取消）/ PENDING_REFUND（退款申请中）/ REFUNDED（已退款）
 */
import { formatAmount, formatPrice } from './currency.js'
import { i18n } from '../locales/index.js'

/** 订单状态文案：走 i18n status.* 命名空间，随语言切换。 */
export function statusText(status) {
  const { t } = i18n.global
  if (!status) return t('status.UNKNOWN')
  const key = `status.${status}`
  const text = t(key)
  // vue-i18n 缺失 key 时返回 key 本身，回退显示原始状态码
  return text === key ? status : text
}

/** 优先展示下单锁定的金额/币种；无锁定值时按当前展示币种换算基准金额。 */
export function orderAmountText(order) {
  if (order && order.displayAmount != null && order.displayCurrency) {
    return formatAmount(Number(order.displayAmount), order.displayCurrency)
  }
  return formatPrice(order?.totalAmount, { from: order?.currency })
}
