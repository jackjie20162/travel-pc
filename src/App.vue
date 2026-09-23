<template>
  <div class="site-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">G</span>
        <span>
          <strong>{{ t('pc.brand') }}</strong>
          <small>{{ t('pc.brandSub') }}</small>
        </span>
      </RouterLink>

      <form class="header-search" @submit.prevent="submitSearch">
        <span class="search-icon">⌕</span>
        <input v-model="keyword" :placeholder="t('pc.nav.searchPh')" />
        <button type="submit">{{ t('pc.nav.search') }}</button>
      </form>

      <nav class="site-nav" aria-label="Primary navigation">
        <RouterLink to="/destinations/dubai">{{ t('pc.nav.dubai') }}</RouterLink>
        <RouterLink to="/destinations/abu-dhabi">{{ t('pc.nav.abuDhabi') }}</RouterLink>
        <RouterLink to="/destinations/doha">{{ t('pc.nav.doha') }}</RouterLink>
        <select v-model="localeCode" class="nav-currency" :title="t('pc.nav.currencyTitle')" @change="onLocaleChange">
          <option v-for="l in supportedLocales" :key="l" :value="l">{{ localeLabels[l] }}</option>
        </select>
        <select v-model="currencyCode" class="nav-currency" :title="t('pc.nav.currencyTitle')" @change="onCurrencyChange">
          <option v-for="c in currencyList" :key="c.code" :value="c.code">{{ c.code }}</option>
        </select>
        <RouterLink v-if="user.isLoggedIn.value" to="/orders">{{ t('pc.nav.myOrders') }}</RouterLink>
        <button
          v-if="user.isLoggedIn.value"
          type="button"
          class="nav-support"
          :class="{ alert: imState.orderAlert > 0 }"
          @click="openSupport"
        >
          {{ t('pc.nav.support') }}
          <span v-if="imState.unreadTotal > 0" class="nav-badge">{{ imState.unreadTotal > 99 ? '99+' : imState.unreadTotal }}</span>
        </button>
        <template v-if="user.isLoggedIn.value">
          <span class="nav-user" :title="user.email.value">{{ user.nickname.value || user.username.value }}</span>
          <button type="button" class="nav-logout" @click="handleLogout">{{ t('pc.nav.logout') }}</button>
        </template>
        <RouterLink v-else to="/login">{{ t('pc.nav.login') }}</RouterLink>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>

    <footer class="site-footer">
      <div>
        <strong>{{ t('pc.brand') }}</strong>
        <p>{{ t('pc.footer.desc') }}</p>
      </div>
      <div class="footer-links">
        <a href="#top">{{ t('pc.footer.backToTop') }}</a>
        <RouterLink to="/destinations/dubai">{{ t('pc.footer.exploreDubai') }}</RouterLink>
        <RouterLink to="/destinations/abu-dhabi">{{ t('pc.footer.exploreAbuDhabi') }}</RouterLink>
      </div>
    </footer>

    <ImSupportDrawer />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useUser } from './composables/user.js'
import { useLocale } from './composables/useLocale.js'
import { currencies, selectedCurrency, setSelectedCurrency } from './utils/currency.js'
import ImSupportDrawer from './plugin/im/ImSupportDrawer.vue'
import { imState, imConnect, imDisconnect, imOpenSupport } from './plugin/im/imStore'

const route = useRoute()
const router = useRouter()
const user = useUser()
const { t, locale, setLocale, supportedLocales, localeLabels } = useLocale()
const keyword = ref(route.query.keyword || '')
const currencyCode = ref(selectedCurrency.value)
const currencyList = currencies
const localeCode = ref(locale.value)

watch(
  () => route.query.keyword,
  (value) => {
    keyword.value = value || ''
  },
)

function onCurrencyChange() {
  setSelectedCurrency(currencyCode.value)
}

function onLocaleChange() {
  setLocale(localeCode.value)
}

function handleLogout() {
  imDisconnect()
  user.logout()
  router.push({ name: 'Home' })
}

function openSupport() {
  imOpenSupport()
}

// 登录态变化驱动 IM 连接：登录后常驻在线接收订单推送，登出断开
watch(
  () => user.isLoggedIn.value,
  (logged) => {
    if (logged) imConnect()
    else imDisconnect()
  },
)

// 已登录时刷新用户资料；仅在 token 失效(401/403)时由 fetchProfile 内部登出
onMounted(() => {
  if (user.isLoggedIn.value) {
    imConnect()
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
