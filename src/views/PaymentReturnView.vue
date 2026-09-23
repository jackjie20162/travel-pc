<template>
  <div class="page payment-page">
    <div class="container narrow">
      <!-- 加载中 -->
      <div v-if="loading" class="pc-card result-state">
        <div class="pc-spinner"></div>
        <h2>支付确认中，请勿关闭页面...</h2>
        <p class="muted">正在与 PayPal 确认支付结果，通常需要几秒钟。</p>
      </div>

      <!-- 支付成功 -->
      <div v-else-if="payment" class="pc-card result-state">
        <div class="result-icon success">✓</div>
        <h1>支付成功</h1>
        <p class="muted">订单已进入商户接单流程，接单完成后可查看电子凭证。</p>
        <section class="result-card">
          <div class="summary-line"><span>支付单号</span><span class="mono">{{ payment.paymentNo }}</span></div>
          <div class="summary-line"><span>订单号</span><span class="mono">{{ payment.orderNo }}</span></div>
          <div class="summary-line"><span>支付方式</span><span>PayPal</span></div>
          <div class="summary-line total">
            <span>支付金额</span>
            <strong>{{ payAmountText }}</strong>
          </div>
        </section>
        <div class="result-actions">
          <RouterLink class="wide-button" :to="`/orders/${payment.orderNo}`">查看订单</RouterLink>
          <RouterLink class="btn-secondary" to="/orders">我的订单</RouterLink>
          <RouterLink class="btn-secondary" to="/">继续浏览</RouterLink>
        </div>
      </div>

      <!-- 支付失败 -->
      <div v-else class="pc-card result-state error-state">
        <div class="result-icon fail">✕</div>
        <h1>支付未完成</h1>
        <p class="error-msg">{{ errorMsg }}</p>
        <p class="muted">如已扣款请勿重复支付，稍后可在「我的订单」中查看状态。</p>
        <div class="result-actions">
          <RouterLink class="wide-button" to="/orders">查看我的订单</RouterLink>
          <RouterLink class="btn-secondary" to="/">返回首页</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { capturePaypalPayment } from '../api.js'
import { formatAmount } from '../utils/currency.js'

const route = useRoute()
const loading = ref(true)
const payment = ref(null)
const errorMsg = ref('')

const payAmountText = computed(() => {
  const p = payment.value
  if (!p) return '--'
  const cur = p.displayCurrency || p.currency
  const amt = p.displayAmount != null ? p.displayAmount : p.amount
  return formatAmount(Number(amt), cur)
})

onMounted(async () => {
  try {
    // PayPal 回跳携带 token / PayerID 等参数，透传给后端完成 capture
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') params.set(key, value)
    }
    const qs = params.toString()
    payment.value = await capturePaypalPayment(qs)
  } catch (e) {
    errorMsg.value = e.message || '支付结果确认失败'
  } finally {
    loading.value = false
  }
})
</script>
