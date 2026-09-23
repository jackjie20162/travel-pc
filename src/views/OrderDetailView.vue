<template>
  <div class="page order-detail-page">
    <div class="container narrow">
      <div v-if="loading" class="state-panel">{{ t('pc.orderDetail.loading') }}</div>
      <div v-else-if="!order" class="state-panel">{{ t('pc.orderDetail.notFound') }}</div>
      <template v-else>
        <div v-if="route.query.paid" class="paid-banner">{{ t('pc.orderDetail.paidBanner') }}</div>

        <!-- 状态头 -->
        <div class="order-status-header" :class="order.status">
          <div>
            <h1>{{ statusText(order.status) }}</h1>
            <p class="mono">{{ order.orderNo }}</p>
          </div>
          <div class="order-status-actions">
            <RouterLink
              v-if="order.status === 'PENDING_PAYMENT'"
              class="wide-button inline"
              :to="{ name: 'Payment', query: { orderNo: order.orderNo, totalAmount: order.totalAmount, currency: order.currency, displayAmount: order.displayAmount, displayCurrency: order.displayCurrency } }"
            >{{ t('pc.orderDetail.goPay') }}</RouterLink>
            <button v-if="canCancel" type="button" class="btn-secondary danger" @click="showCancelDialog">{{ t('pc.orderDetail.cancelOrder') }}</button>
            <button v-if="canRequestRefund" type="button" class="btn-secondary" @click="showRefundDialog">{{ t('pc.orderDetail.requestRefund') }}</button>
            <button type="button" class="btn-secondary" @click="consultOrder">{{ t('pc.orderDetail.consultOrder') }}</button>
          </div>
        </div>

        <!-- 订单信息 -->
        <section class="pc-card">
          <h3>{{ t('pc.orderDetail.orderInfo') }}</h3>
          <div class="summary-line"><span>{{ t('pc.orderDetail.product') }}</span><span>{{ order.productTitle || t('pc.orderDetail.defaultProduct') }}</span></div>
          <div class="summary-line"><span>{{ t('pc.orderDetail.travelDate') }}</span><span>{{ order.date || '--' }}</span></div>
          <div class="summary-line"><span>{{ t('pc.orderDetail.timeSlot') }}</span><span>{{ order.timeSlot || '--' }}</span></div>
          <div class="summary-line"><span>{{ t('pc.orderDetail.quantity') }}</span><span>{{ order.quantity || 1 }}</span></div>
          <div class="summary-line"><span>{{ t('pc.orderDetail.createTime') }}</span><span>{{ formatDateTime(order.createtime || order.createTime) }}</span></div>
          <div class="summary-line total"><span>{{ t('pc.orderDetail.paidAmount') }}</span><strong>{{ orderAmountText(order) }}</strong></div>
        </section>

        <!-- 联系人与出行人 -->
        <section class="pc-card">
          <h3>{{ t('pc.orderDetail.contact') }}</h3>
          <div class="summary-line"><span>{{ t('pc.orderDetail.name') }}</span><span>{{ order.customerName || '--' }}</span></div>
          <div class="summary-line"><span>{{ t('pc.orderDetail.email') }}</span><span>{{ order.customerEmail || '--' }}</span></div>
          <div class="summary-line"><span>{{ t('pc.orderDetail.phone') }}</span><span>{{ order.customerPhone || '--' }}</span></div>
        </section>

        <section v-if="travelers.length" class="pc-card">
          <h3>{{ t('pc.orderDetail.travelerInfo') }}</h3>
          <div class="travelers-grid">
            <div v-for="(tr, idx) in travelers" :key="idx" class="traveler-row">
              <strong>{{ tr.name }}</strong>
              <span class="muted">{{ idTypeLabel(tr.idType) }} {{ tr.idNumber || '--' }}<template v-if="tr.phone"> · {{ tr.phone }}</template></span>
            </div>
          </div>
        </section>

        <section v-if="order.remark" class="pc-card">
          <h3>{{ t('pc.orderDetail.specialNeeds') }}</h3>
          <p>{{ order.remark }}</p>
        </section>

        <!-- 电子凭证 -->
        <section v-if="order.status === 'PENDING_VERIFY' || order.status === 'VERIFIED'" class="pc-card voucher-card">
          <h3>{{ t('pc.orderDetail.voucher') }}</h3>
          <div class="voucher-box">
            <div class="voucher-no mono">{{ order.voucherNo || order.orderNo }}</div>
            <small>{{ t('pc.orderDetail.voucherHint') }}</small>
          </div>
        </section>

        <!-- 退款处理中 -->
        <section v-if="order.status === 'PENDING_REFUND'" class="pc-card refund-notice">
          <h3>{{ t('pc.orderDetail.refundPending') }}</h3>
          <p>{{ t('pc.orderDetail.refundPendingDesc') }}</p>
          <p v-if="order.rejectReason" class="muted">{{ t('pc.orderDetail.merchantReply') }}{{ order.rejectReason }}</p>
        </section>

        <div class="detail-back">
          <RouterLink class="btn-secondary" to="/orders">{{ t('pc.orderDetail.backToList') }}</RouterLink>
          <RouterLink class="text-link" to="/">{{ t('pc.orderDetail.continueBrowse') }}</RouterLink>
        </div>
      </template>
    </div>

    <!-- 取消订单弹窗 -->
    <div v-if="cancelDialogVisible" class="pc-modal-overlay" @click.self="cancelDialogVisible = false">
      <div class="pc-modal">
        <div class="pc-modal-header">
          <h3>{{ t('pc.orderDetail.cancelTitle') }}</h3>
          <button type="button" class="modal-close" @click="cancelDialogVisible = false">✕</button>
        </div>
        <p class="muted hint">{{ t('pc.orderDetail.cancelHint') }}</p>
        <label class="modal-field">
          <span>{{ t('pc.orderDetail.cancelReason') }}</span>
          <textarea v-model="cancelReason" rows="3" :placeholder="t('pc.orderDetail.cancelReasonPh')"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="cancelDialogVisible = false">{{ t('pc.orderDetail.back') }}</button>
          <button type="button" class="btn-secondary danger" :disabled="!cancelReason.trim() || cancelling" @click="handleCancel">
            {{ cancelling ? t('pc.orderDetail.submitting') : t('pc.orderDetail.confirmCancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 申请退款弹窗 -->
    <div v-if="refundDialogVisible" class="pc-modal-overlay" @click.self="refundDialogVisible = false">
      <div class="pc-modal">
        <div class="pc-modal-header">
          <h3>{{ t('pc.orderDetail.refundTitle') }}</h3>
          <button type="button" class="modal-close" @click="refundDialogVisible = false">✕</button>
        </div>
        <p class="muted hint">{{ t('pc.orderDetail.refundHint') }}</p>
        <label class="modal-field">
          <span>{{ t('pc.orderDetail.refundReason') }}</span>
          <textarea v-model="refundReason" rows="3" :placeholder="t('pc.orderDetail.refundReasonPh')"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="refundDialogVisible = false">{{ t('pc.orderDetail.back') }}</button>
          <button type="button" class="btn-secondary" :disabled="!refundReason.trim() || requestingRefund" @click="handleRequestRefund">
            {{ requestingRefund ? t('pc.orderDetail.submitting') : t('pc.orderDetail.submitRequest') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="actionError" class="pc-error-toast">{{ actionError }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getOrder, cancelOrder, requestRefund } from '../api.js'
import { statusText, orderAmountText } from '../utils/order.js'
import { useLocale } from '../composables/useLocale.js'
import { imOpenSupport } from '../plugin/im/imStore'

const route = useRoute()
const { t, locale } = useLocale()
const order = ref(null)
const loading = ref(true)
const actionError = ref('')

function idTypeLabel(val) {
  return val ? t(`pc.orderDetail.idTypes.${val}`) : t('pc.orderDetail.idLabel')
}

function formatDateTime(ts) {
  if (!ts) return '--'
  const n = Number(ts)
  if (Number.isNaN(n)) return String(ts)
  return new Date(n * (n > 1e12 ? 1 : 1000)).toLocaleString(locale.value)
}

const travelers = computed(() => order.value?.travelers || [])

/** 咨询此订单：打开 IM 抽屉并自动发送订单卡片（contentType=4） */
function consultOrder() {
  if (!order.value) return
  imOpenSupport({ order: order.value })
}

// 待支付可取消；待接单/待核销可申请退款（与 travel-app 状态机一致）
const canCancel = computed(() => order.value?.status === 'PENDING_PAYMENT')
const canRequestRefund = computed(() => {
  const s = order.value?.status
  return s === 'PENDING_ACCEPTANCE' || s === 'PENDING_VERIFY'
})

const cancelDialogVisible = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)
const refundDialogVisible = ref(false)
const refundReason = ref('')
const requestingRefund = ref(false)

function showCancelDialog() {
  cancelReason.value = ''
  cancelDialogVisible.value = true
}

async function handleCancel() {
  if (!cancelReason.value.trim()) return
  cancelling.value = true
  actionError.value = ''
  try {
    await cancelOrder(route.params.orderNo)
    cancelDialogVisible.value = false
    await loadOrder()
  } catch (e) {
    actionError.value = e.message || t('pc.orderDetail.cancelFailed')
  } finally {
    cancelling.value = false
  }
}

function showRefundDialog() {
  refundReason.value = ''
  refundDialogVisible.value = true
}

async function handleRequestRefund() {
  if (!refundReason.value.trim()) return
  requestingRefund.value = true
  actionError.value = ''
  try {
    await requestRefund(route.params.orderNo, refundReason.value)
    refundDialogVisible.value = false
    await loadOrder()
  } catch (e) {
    actionError.value = e.message || t('pc.orderDetail.refundFailed')
  } finally {
    requestingRefund.value = false
  }
}

async function loadOrder() {
  loading.value = true
  try {
    order.value = await getOrder(route.params.orderNo)
  } catch (e) {
    console.error('加载订单失败', e)
    order.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadOrder)
</script>
