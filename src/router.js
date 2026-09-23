import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from './api.js'
import HomeView from './views/HomeView.vue'
import DestinationView from './views/DestinationView.vue'
import ProductDetailView from './views/ProductDetailView.vue'

// PayPal/Stripe 同步返回兼容：后端 return_url 配置的是原始路径（如 /payments/return?token=..&PayerID=..），
// PC 使用 hash 路由，需要把「路径 + query」重写成「hash 路由 + query」后再交给 router 处理。
const paypalReturnQuery = window.location.search
if (paypalReturnQuery && /(token=.*PayerID=|cancel=|paymentNO=)/i.test(paypalReturnQuery)) {
  window.location.replace(`#/payments/return${paypalReturnQuery}`)
}

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/destinations/:slug?', name: 'Destination', component: DestinationView },
  { path: '/products/:id', name: 'ProductDetail', component: ProductDetailView },
  { path: '/booking', name: 'Booking', component: () => import('./views/BookingView.vue'), meta: { requiresAuth: true } },
  { path: '/payment', name: 'Payment', component: () => import('./views/PaymentView.vue'), meta: { requiresAuth: true } },
  { path: '/payments/return', name: 'PaymentReturn', component: () => import('./views/PaymentReturnView.vue') },
  { path: '/orders', name: 'Orders', component: () => import('./views/OrdersView.vue'), meta: { requiresAuth: true } },
  { path: '/orders/:orderNo', name: 'OrderDetail', component: () => import('./views/OrderDetailView.vue'), meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: () => import('./views/LoginView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 需要登录的页面统一跳转登录页并携带回跳地址
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !getToken()) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
