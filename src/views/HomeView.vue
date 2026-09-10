<template>
  <div id="top" class="page">
    <section class="home-hero">
      <img class="hero-image" :src="heroImage" alt="Dubai skyline" />
      <div class="hero-overlay"></div>
      <div class="hero-content container">
        <p class="eyebrow">Middle East travel marketplace</p>
        <h1>预订中东值得专程体验的活动</h1>
        <p class="hero-copy">覆盖迪拜、阿布扎比、多哈与利雅得，从沙漠冲沙到城市地标，一站完成搜索、比价和下单。</p>
        <form class="hero-search" @submit.prevent="goSearch">
          <span>⌕</span>
          <input v-model="keyword" placeholder="你想体验什么？例如 沙漠冲沙、哈利法塔、游艇" />
          <button type="submit">搜索</button>
        </form>
      </div>
    </section>

    <section class="container trust-strip">
      <span v-for="item in trustItems" :key="item">{{ item }}</span>
    </section>

    <section class="container section-block">
      <div class="section-title-row">
        <div>
          <p class="eyebrow dark">Explore by destination</p>
          <h2>热门中东目的地</h2>
        </div>
        <RouterLink class="text-link" to="/destinations/dubai">查看全部</RouterLink>
      </div>
      <div class="destination-grid">
        <RouterLink
          v-for="destination in destinations"
          :key="destination.slug"
          class="destination-card"
          :to="`/destinations/${destination.slug}`"
        >
          <img :src="destination.image" :alt="destination.zhName" loading="lazy" />
          <div>
            <span>{{ destination.country }}</span>
            <h3>{{ destination.zhName }}</h3>
            <p>{{ destination.headline }}</p>
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="container section-block">
      <div class="section-title-row">
        <div>
          <p class="eyebrow dark">Browse experiences</p>
          <h2>按主题发现体验</h2>
        </div>
      </div>
      <div class="theme-row">
        <button v-for="theme in themes" :key="theme.name" type="button" @click="goTheme(theme)">
          <span>{{ theme.icon }}</span>
          {{ theme.name }}
        </button>
      </div>
    </section>

    <section class="container section-block">
      <div class="section-title-row">
        <div>
          <p class="eyebrow dark">Top activities</p>
          <h2>迪拜热门体验</h2>
        </div>
        <RouterLink class="text-link" to="/destinations/dubai">更多活动</RouterLink>
      </div>
      <div v-if="loading" class="state-panel">正在加载真实旅游商品...</div>
      <div v-else-if="!products.length" class="state-panel">
        暂无已发布商品。请先在商户端发布旅游产品，PC 官网会读取 `GET /api/travel/products`。
      </div>
      <div v-else class="product-grid">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :fallback-image="destinations[0].image"
          @open="openProduct"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import { getProducts } from '../api.js'
import { destinations, themes, trustItems } from '../data/middleEast.js'

const router = useRouter()
const keyword = ref('')
const products = ref([])
const loading = ref(false)
const heroImage = destinations[0].image

function goSearch() {
  router.push({
    path: '/destinations/dubai',
    query: keyword.value ? { keyword: keyword.value } : {},
  })
}

function goTheme(theme) {
  router.push({ path: '/destinations/dubai', query: { keyword: theme.query } })
}

function openProduct(product) {
  router.push({ name: 'ProductDetail', params: { id: product.id } })
}

async function loadProducts() {
  loading.value = true
  try {
    const data = await getProducts({ destination: 'Dubai', pageSize: 8 })
    products.value = data.items
  } catch (error) {
    console.error('加载首页商品失败', error)
    products.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)
</script>
