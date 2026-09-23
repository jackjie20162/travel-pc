<template>
  <div class="page order-detail-page">
    <div class="container narrow">
      <div v-if="loading" class="state-panel">加载中...</div>
      <div v-else-if="!order" class="state-panel">订单不存在。</div>
      <template v-else>
        <div v-if="route.query.paid" class="paid-banner">支付已完成，商户接单后可查看电子凭证。</div>

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
            >去支付</RouterLink>
            <button v-if="canCancel" type="button" class="btn-secondary danger" @click="showCancelDialog">取消订单</button>
            <button v-if="canRequestRefund" type="button" class="btn-secondary" @click="showRefundDialog">申请退款</button>
            <button type="button" class="btn-secondary" @click="consultOrder">💬 咨询此订单</button>
          </div>
        </div>

        <!-- 订单信息 -->
        <section class="pc-card">
          <h3>订单信息</h3>
          <div class="summary-line"><span>商品</span><span>{{ order.productTitle || '中东体验' }}</span></div>
          <div class="summary-line"><span>出行日期</span><span>{{ order.date || '--' }}</span></div>
          <div class="summary-line"><span>场次</span><span>{{ order.timeSlot || '--' }}</span></div>
          <div class="summary-line"><span>数量</span><span>{{ order.quantity || 1 }}</span></div>
          <div class="summary-line"><span>下单时间</span><span>{{ formatDateTime(order.createtime || order.createTime) }}</span></div>
          <div class="summary-line total"><span>实付金额</span><strong>{{ orderAmountText(order) }}</strong></div>
        </section>

        <!-- 联系人与出行人 -->
        <section class="pc-card">
          <h3>联系人</h3>
          <div class="summary-line"><span>姓名</span><span>{{ order.customerName || '--' }}</span></div>
          <div class="summary-line"><span>邮箱</span><span>{{ order.customerEmail || '--' }}</span></div>
          <div class="summary-line"><span>电话</span><span>{{ order.customerPhone || '--' }}</span></div>
        </section>

        <section v-if="travelers.length" class="pc-card">
          <h3>出行人信息</h3>
          <div class="travelers-grid">
            <div v-for="(tr, idx) in travelers" :key="idx" class="traveler-row">
              <strong>{{ tr.name }}</strong>
              <span class="muted">{{ idTypeLabel(tr.idType) }} {{ tr.idNumber || '--' }}<template v-if="tr.phone"> · {{ tr.phone }}</template></span>
            </div>
          </div>
        </section>

        <section v-if="order.remark" class="pc-card">
          <h3>特殊需求</h3>
          <p>{{ order.remark }}</p>
        </section>

        <!-- 电子凭证 -->
        <section v-if="order.status === 'PENDING_VERIFY' || order.status === 'VERIFIED'" class="pc-card voucher-card">
          <h3>电子凭证</h3>
          <div class="voucher-box">
            <div class="voucher-no mono">{{ order.voucherNo || order.orderNo }}</div>
            <small>请在集合点向工作人员出示凭证号核销</small>
          </div>
        </section>

        <!-- 退款处理中 -->
        <section v-if="order.status === 'PENDING_REFUND'" class="pc-card refund-notice">
          <h3>退款申请中</h3>
          <p>您的退款申请已提交，等待商户处理。</p>
          <p v-if="order.rejectReason" class="muted">商户回复：{{ order.rejectReason }}</p>
        </section>

        <div class="detail-back">
          <RouterLink class="btn-secondary" to="/orders">返回订单列表</RouterLink>
          <RouterLink class="text-link" to="/">继续浏览</RouterLink>
        </div>
      </template>
    </div>

    <!-- 取消订单弹窗 -->
    <div v-if="cancelDialogVisible" class="pc-modal-overlay" @click.self="cancelDialogVisible = false">
      <div class="pc-modal">
        <div class="pc-modal-header">
          <h3>取消订单</h3>
          <button type="button" class="modal-close" @click="cancelDialogVisible = false">✕</button>
        </div>
        <p class="muted hint">仅未支付的订单可直接取消；已支付订单请走「申请退款」。</p>
        <label class="modal-field">
          <span>取消原因</span>
          <textarea v-model="cancelReason" rows="3" placeholder="请说明取消原因"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="cancelDialogVisible = false">返回</button>
          <button type="button" class="btn-secondary danger" :disabled="!cancelReason.trim() || cancelling" @click="handleCancel">
            {{ cancelling ? '提交中...' : '确认取消' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 申请退款弹窗 -->
    <div v-if="refundDialogVisible" class="pc-modal-overlay" @click.self="refundDialogVisible = false">
      <div class="pc-modal">
        <div class="pc-modal-header">
          <h3>申请退款</h3>
          <button type="button" class="modal-close" @click="refundDialogVisible = false">✕</button>
        </div>
        <p class="muted hint">退款申请提交后需等待商户审批，按退订政策可能收取损失费。</p>
        <label class="modal-field">
          <span>退款原因</span>
          <textarea v-model="refundReason" rows="3" placeholder="请说明退款原因"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="refundDialogVisible = false">返回</button>
          <button type="button" class="btn-secondary" :disabled="!refundReason.trim() || requestingRefund" @click="handleRequestRefund">
            {{ requestingRefund ? '提交中...' : '提交申请' }}
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
import { imOpenSupport } from '../plugin/im/imStore'

const route = useRoute()
const order = ref(null)
const loading = ref(true)
const actionError = ref('')

const ID_TYPE_LABELS = { passport: '护照', id_card: '身份证', other_id: '其他证件' }
function idTypeLabel(val) {
  return ID_TYPE_LABELS[val] || val || '证件'
}

function formatDateTime(ts) {
  if (!ts) return '--'
  const n = Number(ts)
  if (Number.isNaN(n)) return String(ts)
  return new Date(n * (n > 1e12 ? 1 : 1000)).toLocaleString('zh-CN')
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
    actionError.value = e.message || '取消失败'
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
    actionError.value = e.message || '申请失败'
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
