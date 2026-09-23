/**
 * 订单状态与金额展示工具（与 travel-app 状态机对齐）
 *
 * 状态流：PENDING_PAYMENT → PENDING_ACCEPTANCE（支付成功待接单）
 *        → PENDING_VERIFY（商户接单待核销）→ VERIFIED → COMPLETED
 * 分支：CANCELLED（取消）/ PENDING_REFUND（退款申请中）/ REFUNDED（已退款）
 */
import { formatAmount, formatPrice } from './currency.js'

const STATUS_TEXT = {
  PENDING_PAYMENT: '待支付',
  PAYMENT_PROCESSING: '支付处理中',
  PENDING_ACCEPTANCE: '待接单',
  PENDING_VERIFY: '待核销',
  VERIFIED: '已核销',
  CONFIRMED: '已确认',
  PENDING_REFUND: '退款中',
  REFUNDED: '已退款',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  UNKNOWN: '未知状态',
}

export function statusText(status) {
  if (!status) return STATUS_TEXT.UNKNOWN
  return STATUS_TEXT[status] || status
}

/** 优先展示下单锁定的金额/币种；无锁定值时按当前展示币种换算基准金额。 */
export function orderAmountText(order) {
  if (order && order.displayAmount != null && order.displayCurrency) {
    return formatAmount(Number(order.displayAmount), order.displayCurrency)
  }
  return formatPrice(order?.totalAmount, { from: order?.currency })
}
