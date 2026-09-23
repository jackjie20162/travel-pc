<template>
  <div id="top" class="page">
    <section class="home-hero">
      <img class="hero-image" :src="heroImage" alt="Dubai skyline" />
      <div class="hero-overlay"></div>
      <div class="hero-content container">
        <p class="eyebrow">{{ t('pc.home.eyebrow') }}</p>
        <h1>{{ t('pc.home.heroTitle') }}</h1>
        <p class="hero-copy">{{ t('pc.home.heroCopy') }}</p>
        <form class="hero-search" @submit.prevent="goSearch">
          <span>⌕</span>
          <input v-model="keyword" :placeholder="t('pc.home.heroSearchPh')" />
          <button type="submit">{{ t('pc.home.search') }}</button>
        </form>
      </div>
    </section>

    <section class="container trust-strip">
      <span v-for="key in trustKeys" :key="key">{{ t('pc.trust.' + key) }}</span>
    </section>

    <section class="container section-block">
      <div class="section-title-row">
        <div>
          <p class="eyebrow dark">{{ t('pc.home.exploreByDest') }}</p>
          <h2>{{ t('pc.home.hotDestinations') }}</h2>
        </div>
        <RouterLink class="text-link" to="/destinations/dubai">{{ t('pc.home.viewAll') }}</RouterLink>
      </div>
      <div class="destination-grid">
        <RouterLink
          v-for="destination in destinations"
          :key="destination.slug"
          class="destination-card"
          :to="`/destinations/${destination.slug}`"
        >
          <img :src="destination.image" :alt="t('pc.dest.' + destination.slug + '.name')" loading="lazy" />
          <div>
            <span>{{ destination.country }}</span>
            <h3>{{ t('pc.dest.' + destination.slug + '.name') }}</h3>
            <p>{{ t('pc.dest.' + destination.slug + '.headline') }}</p>
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="container section-block">
      <div class="section-title-row">
        <div>
          <p class="eyebrow dark">{{ t('pc.home.browseExp') }}</p>
          <h2>{{ t('pc.home.discoverByTheme') }}</h2>
        </div>
      </div>
      <div class="theme-row">
        <button v-for="theme in themes" :key="theme.key" type="button" @click="goTheme(theme)">
          <span>{{ theme.icon }}</span>
          {{ t('pc.themes.' + theme.key) }}
        </button>
      </div>
    </section>

    <section class="container section-block">
      <div class="section-title-row">
        <div>
          <p class="eyebrow dark">{{ t('pc.home.topActivities') }}</p>
          <h2>{{ t('pc.home.dubaiHot') }}</h2>
        </div>
        <RouterLink class="text-link" to="/destinations/dubai">{{ t('pc.home.moreActivities') }}</RouterLink>
      </div>
      <div v-if="loading" class="state-panel">{{ t('pc.home.loading') }}</div>
      <div v-else-if="!products.length" class="state-panel">
        {{ t('pc.home.empty') }}
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
import { destinations, themes, trustKeys } from '../data/middleEast.js'
import { useLocale } from '../composables/useLocale.js'

const router = useRouter()
const { t } = useLocale()
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
