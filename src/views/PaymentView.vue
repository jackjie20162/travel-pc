<template>
  <div class="page payment-page">
    <div class="container narrow">
      <div class="pc-stepper-nav">
        <span class="step done">1 选择</span>
        <i class="step-line"></i>
        <span class="step done">2 确认</span>
        <i class="step-line"></i>
        <span class="step current">3 支付</span>
      </div>

      <h1 class="pc-page-title">收银台</h1>

      <!-- 订单信息 -->
      <section class="pc-card">
        <div class="summary-line"><span>订单号</span><span class="mono">{{ orderNo }}</span></div>
        <div class="summary-line total">
          <span>应付金额</span>
          <strong>{{ payAmountText }}</strong>
        </div>
      </section>

      <!-- 支付方式 -->
      <section class="pc-card">
        <h3>选择支付方式</h3>
        <div class="pay-methods">
          <label class="pay-method" :class="{ selected: provider === 'paypal' }">
            <input v-model="provider" type="radio" value="paypal" />
            <span class="pay-icon">🅿️</span>
            <div>
              <h4>PayPal</h4>
              <small>跳转 PayPal 完成支付，支持余额与银行卡</small>
            </div>
          </label>
          <label class="pay-method" :class="{ selected: provider === 'stripe' }">
            <input v-model="provider" type="radio" value="stripe" />
            <span class="pay-icon">💳</span>
            <div>
              <h4>Stripe 信用卡</h4>
              <small>Visa / Mastercard / AMEX，页面内安全支付</small>
            </div>
          </label>
        </div>
      </section>

      <!-- Stripe 内嵌支付表单 -->
      <section v-if="provider === 'stripe'" class="pc-card">
        <div v-if="stripeLoading" class="stripe-loading">正在初始化 Stripe 支付组件...</div>
        <div v-show="stripeReady" ref="paymentElRef" class="stripe-element"></div>
        <button
          v-if="stripeReady"
          type="button"
          class="wide-button stripe-pay-btn"
          :disabled="stripeSubmitting"
          @click="handleStripePay"
        >
          {{ stripeSubmitting ? '处理中...' : `立即支付 ${payAmountText}` }}
        </button>
      </section>

      <!-- PayPal 支付按钮 -->
      <div v-if="provider === 'paypal'" class="payment-action">
        <button type="button" class="wide-button" :disabled="paying" @click="pay">
          {{ paying ? '处理中...' : `立即支付 ${payAmountText}` }}
        </button>
      </div>

      <div v-if="error" class="pc-error-toast">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createPayment, createStripeIntent } from '../api.js'
import { formatAmount, formatPrice } from '../utils/currency.js'

const route = useRoute()
const router = useRouter()

const orderNo = route.query.orderNo || ''
const totalAmount = parseInt(route.query.totalAmount) || 0
// 下单锁汇后由 Booking 透传 displayAmount/displayCurrency；未就绪时回退按基准币换算
const lockedAmount = route.query.displayAmount
const lockedCurrency = route.query.displayCurrency

const provider = ref('paypal')
const paying = ref(false)
const error = ref('')

const payAmountText = computed(() => {
  if (lockedAmount != null && lockedCurrency) {
    return formatAmount(Number(lockedAmount), lockedCurrency)
  }
  return formatPrice(totalAmount, { from: route.query.currency })
})

function generateIdempotencyKey(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/* ── PayPal：后端创建订单返回 checkoutUrl，整页跳转 ── */
async function pay() {
  if (paying.value) return
  paying.value = true
  error.value = ''
  try {
    const resp = await createPayment({
      orderNo,
      provider: provider.value,
      idempotencyKey: generateIdempotencyKey('pay'),
    })
    if (resp.checkoutUrl) {
      window.location.href = resp.checkoutUrl
    } else {
      router.push({ name: 'OrderDetail', params: { orderNo }, query: { paid: 1 } })
    }
  } catch (e) {
    error.value = e.message || '发起支付失败'
  } finally {
    paying.value = false
  }
}

/* ── Stripe：Payment Element（CDN 加载 Stripe.js，免 npm 依赖） ── */
const paymentElRef = ref(null)
const stripeLoading = ref(false)
const stripeReady = ref(false)
const stripeSubmitting = ref(false)
let stripe = null
let elements = null
let paymentElement = null

function loadStripeSdk() {
  return new Promise((resolve, reject) => {
    if (window.Stripe) return resolve(window.Stripe)
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error('Stripe.js 加载异常')))
    script.onerror = () => reject(new Error('Stripe.js 加载失败，请检查网络'))
    document.head.appendChild(script)
  })
}

async function initStripe() {
  stripeLoading.value = true
  stripeReady.value = false
  error.value = ''
  try {
    const resp = await createStripeIntent({
      orderNo,
      idempotencyKey: generateIdempotencyKey('stripe'),
    })
    const { clientSecret, publishableKey } = resp
    if (!clientSecret || !publishableKey) throw new Error('Stripe 初始化失败：缺少 clientSecret')

    const Stripe = await loadStripeSdk()
    stripe = Stripe(publishableKey)
    elements = stripe.elements({ clientSecret })
    paymentElement = elements.create('payment', { layout: 'tabs' })
    paymentElement.on('ready', () => {
      stripeReady.value = true
      stripeLoading.value = false
    })
    paymentElement.on('change', (e) => {
      error.value = e.error ? e.error.message : ''
    })
    // v-show 保证容器已渲染，nextTick 后挂载
    setTimeout(() => paymentElement.mount(paymentElRef.value), 0)
  } catch (e) {
    stripeLoading.value = false
    error.value = e.message || 'Stripe 初始化失败'
  }
}

function destroyStripe() {
  try { paymentElement?.unmount() } catch { /* ignore */ }
  paymentElement = null
  elements = null
  stripe = null
  stripeReady.value = false
}

watch(provider, (val) => {
  if (val === 'stripe') {
    if (!stripeReady.value && !stripeLoading.value) initStripe()
  } else {
    destroyStripe()
  }
})

onBeforeUnmount(destroyStripe)

async function handleStripePay() {
  if (stripeSubmitting.value || !stripe || !elements) return
  stripeSubmitting.value = true
  error.value = ''
  try {
    const result = await stripe.confirmPayment({
      elements,
      // PC 为 hash 路由，3DS 重定向回跳也要落到 hash 上的支付结果处理
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}#/orders/${orderNo}?paid=1`,
      },
      redirect: 'if_required',
    })
    if (result.error) {
      error.value = result.error.message || '支付失败'
    } else if (result.paymentIntent?.status === 'succeeded') {
      router.push({ name: 'OrderDetail', params: { orderNo }, query: { paid: 1 } })
    }
  } catch (e) {
    error.value = e.message || '支付失败'
  } finally {
    stripeSubmitting.value = false
  }
}
</script>
