<template>
  <div id="top" class="page muted-page">
    <section class="destination-hero">
      <img :src="destination.image" :alt="destination.zhName" />
      <div class="container destination-hero-content">
        <p class="eyebrow">Things to do in {{ destination.name }}</p>
        <h1>{{ destination.zhName }}活动与体验</h1>
        <p>{{ destination.headline }}。筛选热门主题、可订日期和价格区间，找到适合你的行程。</p>
      </div>
    </section>

    <section class="container listing-layout">
      <aside class="filters-panel">
        <h2>筛选</h2>
        <label>
          <span>关键词</span>
          <input v-model="keyword" placeholder="景点、体验、城市" @keyup.enter="loadProducts" />
        </label>
        <label>
          <span>目的地</span>
          <select v-model="selectedDestination" @change="switchDestination">
            <option v-for="item in destinations" :key="item.slug" :value="item.slug">{{ item.zhName }}</option>
          </select>
        </label>
        <div class="filter-group">
          <span>热门主题</span>
          <button
            v-for="theme in themes"
            :key="theme.name"
            type="button"
            :class="{ active: keyword === theme.query }"
            @click="keyword = theme.query; loadProducts()"
          >
            {{ theme.name }}
          </button>
        </div>
        <button class="wide-button" type="button" @click="loadProducts">应用筛选</button>
      </aside>

      <div class="listing-main">
        <div class="listing-toolbar">
          <div>
            <span class="result-count">{{ products.length }} 个结果</span>
            <h2>{{ destination.zhName }}最受欢迎的活动</h2>
          </div>
          <select v-model="sortMode" aria-label="排序">
            <option value="recommended">推荐排序</option>
            <option value="priceLow">价格从低到高</option>
            <option value="priceHigh">价格从高到低</option>
          </select>
        </div>

        <div v-if="loading" class="state-panel">正在加载活动列表...</div>
        <div v-else-if="!sortedProducts.length" class="state-panel">
          没有找到匹配商品。当前页面只展示后端已发布的真实旅游产品。
        </div>
        <div v-else class="activity-list">
          <article v-for="product in sortedProducts" :key="product.id" class="activity-row" @click="openProduct(product)">
            <img :src="cover(product)" :alt="productTitle(product)" loading="lazy" />
            <div class="activity-body">
              <div class="meta-line">{{ productDestination(product) }} · 明日可订 · 电子凭证</div>
              <h3>{{ productTitle(product) }}</h3>
              <p>{{ productDescription(product) }}</p>
              <div class="activity-tags">
                <span>免费取消</span>
                <span>本地供应商</span>
                <span>中文/英文服务</span>
              </div>
              <div class="rating-row">
                <strong>4.8</strong>
                <span>体验评价稳定</span>
              </div>
            </div>
            <div class="activity-price">
              <span>每人起</span>
              <strong>{{ productCurrency(product) }} {{ formatPrice(productPrice(product)) }}</strong>
              <button type="button">查看详情</button>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProducts } from '../api.js'
import { destinationBySlug, destinations, themes } from '../data/middleEast.js'
import {
  formatPrice,
  productCover,
  productCurrency,
  productDescription,
  productDestination,
  productPrice,
  productTitle,
} from '../utils/product.js'

const route = useRoute()
const router = useRouter()
const keyword = ref(route.query.keyword || '')
const selectedDestination = ref(route.params.slug || 'dubai')
const products = ref([])
const loading = ref(false)
const sortMode = ref('recommended')

const destination = computed(() => destinationBySlug(selectedDestination.value))
const fallbackImage = computed(() => destination.value.image)

const sortedProducts = computed(() => {
  const items = [...products.value]
  if (sortMode.value === 'priceLow') {
    items.sort((a, b) => productPrice(a) - productPrice(b))
  }
  if (sortMode.value === 'priceHigh') {
    items.sort((a, b) => productPrice(b) - productPrice(a))
  }
  return items
})

function cover(product) {
  return productCover(product, fallbackImage.value)
}

function switchDestination() {
  router.push({ path: `/destinations/${selectedDestination.value}`, query: keyword.value ? { keyword: keyword.value } : {} })
}

function openProduct(product) {
  router.push({ name: 'ProductDetail', params: { id: product.id } })
}

async function loadProducts() {
  loading.value = true
  try {
    const data = await getProducts({
      keyword: keyword.value || undefined,
      destination: destination.value.name,
      pageSize: 24,
    })
    products.value = data.items
  } catch (error) {
    console.error('加载目的地商品失败', error)
    products.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [route.params.slug, route.query.keyword],
  () => {
    selectedDestination.value = route.params.slug || 'dubai'
    keyword.value = route.query.keyword || ''
    loadProducts()
  },
)

onMounted(loadProducts)
</script>
