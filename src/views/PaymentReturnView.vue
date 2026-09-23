<template>
  <div class="page payment-page">
    <div class="container narrow">
      <!-- 加载中 -->
      <div v-if="loading" class="pc-card result-state">
        <div class="pc-spinner"></div>
        <h2>{{ t('pc.paymentReturn.confirming') }}</h2>
        <p class="muted">{{ t('pc.paymentReturn.confirmingHint') }}</p>
      </div>

      <!-- 支付成功 -->
      <div v-else-if="payment" class="pc-card result-state">
        <div class="result-icon success">✓</div>
        <h1>{{ t('pc.paymentReturn.success') }}</h1>
        <p class="muted">{{ t('pc.paymentReturn.successHint') }}</p>
        <section class="result-card">
          <div class="summary-line"><span>{{ t('pc.paymentReturn.paymentNo') }}</span><span class="mono">{{ payment.paymentNo }}</span></div>
          <div class="summary-line"><span>{{ t('pc.paymentReturn.orderNo') }}</span><span class="mono">{{ payment.orderNo }}</span></div>
          <div class="summary-line"><span>{{ t('pc.paymentReturn.payMethod') }}</span><span>PayPal</span></div>
          <div class="summary-line total">
            <span>{{ t('pc.paymentReturn.payAmount') }}</span>
            <strong>{{ payAmountText }}</strong>
          </div>
        </section>
        <div class="result-actions">
          <RouterLink class="wide-button" :to="`/orders/${payment.orderNo}`">{{ t('pc.paymentReturn.viewOrder') }}</RouterLink>
          <RouterLink class="btn-secondary" to="/orders">{{ t('pc.paymentReturn.myOrders') }}</RouterLink>
          <RouterLink class="btn-secondary" to="/">{{ t('pc.paymentReturn.continueBrowse') }}</RouterLink>
        </div>
      </div>

      <!-- 支付失败 -->
      <div v-else class="pc-card result-state error-state">
        <div class="result-icon fail">✕</div>
        <h1>{{ t('pc.paymentReturn.failed') }}</h1>
        <p class="error-msg">{{ errorMsg }}</p>
        <p class="muted">{{ t('pc.paymentReturn.failedHint') }}</p>
        <div class="result-actions">
          <RouterLink class="wide-button" to="/orders">{{ t('pc.paymentReturn.viewMyOrders') }}</RouterLink>
          <RouterLink class="btn-secondary" to="/">{{ t('pc.paymentReturn.backHome') }}</RouterLink>
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
import { useLocale } from '../composables/useLocale.js'

const route = useRoute()
const { t } = useLocale()
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
    errorMsg.value = e.message || t('pc.paymentReturn.confirmFailed')
  } finally {
    loading.value = false
  }
})
</script>
