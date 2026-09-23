<template>
  <div class="site-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">G</span>
        <span>
          <strong>Global Dubai Travel</strong>
          <small>Middle East experiences</small>
        </span>
      </RouterLink>

      <form class="header-search" @submit.prevent="submitSearch">
        <span class="search-icon">⌕</span>
        <input v-model="keyword" placeholder="搜索城市、景点或体验" />
        <button type="submit">搜索</button>
      </form>

      <nav class="site-nav" aria-label="Primary navigation">
        <RouterLink to="/destinations/dubai">迪拜</RouterLink>
        <RouterLink to="/destinations/abu-dhabi">阿布扎比</RouterLink>
        <RouterLink to="/destinations/doha">多哈</RouterLink>
        <select v-model="currencyCode" class="nav-currency" title="展示币种" @change="onCurrencyChange">
          <option v-for="c in currencyList" :key="c.code" :value="c.code">{{ c.code }}</option>
        </select>
        <RouterLink v-if="user.isLoggedIn.value" to="/orders">我的订单</RouterLink>
        <template v-if="user.isLoggedIn.value">
          <span class="nav-user" :title="user.email.value">{{ user.nickname.value || user.username.value }}</span>
          <button type="button" class="nav-logout" @click="handleLogout">退出</button>
        </template>
        <RouterLink v-else to="/login">登录</RouterLink>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>

    <footer class="site-footer">
      <div>
        <strong>Global Dubai Travel</strong>
        <p>中东目的地体验预订平台，连接真实商品、库存和订单服务。</p>
      </div>
      <div class="footer-links">
        <a href="#top">返回顶部</a>
        <RouterLink to="/destinations/dubai">探索迪拜</RouterLink>
        <RouterLink to="/destinations/abu-dhabi">探索阿布扎比</RouterLink>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useUser } from './composables/user.js'
import { currencies, selectedCurrency, setSelectedCurrency } from './utils/currency.js'

const route = useRoute()
const router = useRouter()
const user = useUser()
const keyword = ref(route.query.keyword || '')
const currencyCode = ref(selectedCurrency.value)
const currencyList = currencies

watch(
  () => route.query.keyword,
  (value) => {
    keyword.value = value || ''
  },
)

function onCurrencyChange() {
  setSelectedCurrency(currencyCode.value)
}

function handleLogout() {
  user.logout()
  router.push({ name: 'Home' })
}

// 已登录时刷新用户资料；仅在 token 失效(401/403)时由 fetchProfile 内部登出
onMounted(() => {
  if (user.isLoggedIn.value) {
    user.fetchProfile().catch(() => { /* 保留本地登录态，失败不强制登出 */ })
  }
})

function submitSearch() {
  router.push({
    path: '/destinations/dubai',
    query: keyword.value ? { keyword: keyword.value } : {},
  })
}
</script>
