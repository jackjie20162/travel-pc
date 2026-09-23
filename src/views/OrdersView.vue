<template>
  <div class="page orders-page">
    <div class="container">
      <h1 class="pc-page-title">我的订单</h1>

      <!-- 状态 Tab：与 travel-app 同一状态机，待支付/待接单显示数量徽章 -->
      <div class="order-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="order-tab"
          :class="{ active: activeTab === tab.value }"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
          <span v-if="badges[tab.value]" class="tab-badge">{{ badges[tab.value] > 99 ? '99+' : badges[tab.value] }}</span>
        </button>
      </div>

      <div v-if="loading && !orders.length" class="state-panel">加载中...</div>
      <div v-else-if="!orders.length" class="state-panel">
        暂无订单。<RouterLink class="text-link" to="/">去挑选体验 →</RouterLink>
      </div>
      <div v-else class="orders-table">
        <div v-for="o in orders" :key="o.orderNo" class="pc-card order-card" @click="goDetail(o.orderNo)">
          <div class="order-card-head">
            <span class="mono">{{ o.orderNo }}</span>
            <span class="order-status" :class="o.status">{{ statusText(o.status) }}</span>
          </div>
          <div class="order-card-body">
            <div>
              <strong>{{ o.productTitle || '中东体验订单' }}</strong>
              <p class="muted">{{ o.date || '' }} · {{ o.quantity || 1 }} 份 · {{ o.customerEmail || '' }}</p>
            </div>
            <div class="order-card-right">
              <strong class="order-amount">{{ orderAmountText(o) }}</strong>
              <div class="order-card-actions" @click.stop>
                <RouterLink
                  v-if="o.status === 'PENDING_PAYMENT'"
                  class="btn-ghost primary"
                  :to="{ name: 'Payment', query: { orderNo: o.orderNo, totalAmount: o.totalAmount, currency: o.currency, displayAmount: o.displayAmount, displayCurrency: o.displayCurrency } }"
                >去支付</RouterLink>
                <button v-else type="button" class="btn-ghost" @click="goDetail(o.orderNo)">查看详情</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="orders.length && orders.length < total" class="load-more">
        <button type="button" class="btn-ghost" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getMyOrders } from '../api.js'
import { statusText, orderAmountText } from '../utils/order.js'

const router = useRouter()
const orders = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const activeTab = ref('')
const page = ref(1)
const total = ref(0)
const badges = reactive({ PENDING_PAYMENT: 0, PENDING_ACCEPTANCE: 0 })

const tabs = [
  { value: '', label: '全部' },
  { value: 'PENDING_PAYMENT', label: '待支付' },
  { value: 'PENDING_ACCEPTANCE', label: '待接单' },
  { value: 'PENDING_VERIFY', label: '待核销' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
]

async function loadOrders(append = false) {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    page.value = 1
    orders.value = []
  }
  try {
    const params = { page: page.value, pageSize: 10 }
    if (activeTab.value) params.status = activeTab.value
    const resp = await getMyOrders(params)
    const items = resp?.items || []
    orders.value = append ? [...orders.value, ...items] : items
    total.value = Number(resp?.total || 0)
  } catch (e) {
    console.error('加载订单失败', e)
    if (!append) orders.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/** 并行拉取待支付/待接单数量用于 tab 徽章 */
async function loadBadgeCounts() {
  try {
    const [p, a] = await Promise.all([
      getMyOrders({ status: 'PENDING_PAYMENT', page: 1, pageSize: 1 }),
      getMyOrders({ status: 'PENDING_ACCEPTANCE', page: 1, pageSize: 1 }),
    ])
    badges.PENDING_PAYMENT = Number(p?.total || 0)
    badges.PENDING_ACCEPTANCE = Number(a?.total || 0)
  } catch { /* ignore */ }
}

function switchTab(val) {
  activeTab.value = val
  loadOrders()
}

function loadMore() {
  page.value++
  loadOrders(true)
}

function goDetail(orderNo) {
  router.push({ name: 'OrderDetail', params: { orderNo } })
}

onMounted(() => {
  loadOrders()
  loadBadgeCounts()
})
</script>
