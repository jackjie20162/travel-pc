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
        <RouterLink to="/orders">我的订单</RouterLink>
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
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const keyword = ref(route.query.keyword || '')

watch(
  () => route.query.keyword,
  (value) => {
    keyword.value = value || ''
  },
)

function submitSearch() {
  router.push({
    path: '/destinations/dubai',
    query: keyword.value ? { keyword: keyword.value } : {},
  })
}
</script>
