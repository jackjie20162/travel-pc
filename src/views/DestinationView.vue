<template>
  <div id="top" class="page muted-page">
    <section class="destination-hero">
      <img :src="destination.image" :alt="t('pc.dest.' + destination.slug + '.name')" />
      <div class="container destination-hero-content">
        <p class="eyebrow">{{ t('pc.destination.thingsToDo') }} {{ destination.name }}</p>
        <h1>{{ t('pc.dest.' + destination.slug + '.name') }}{{ t('pc.destination.activitiesSuffix') }}</h1>
        <p>{{ t('pc.dest.' + destination.slug + '.headline') }}{{ t('pc.destination.heroDesc') }}</p>
      </div>
    </section>

    <section class="container listing-layout">
      <aside class="filters-panel">
        <h2>{{ t('pc.destination.filter') }}</h2>
        <label>
          <span>{{ t('pc.destination.keyword') }}</span>
          <input v-model="keyword" :placeholder="t('pc.destination.keywordPh')" @keyup.enter="loadProducts" />
        </label>
        <label>
          <span>{{ t('pc.destination.destinationLabel') }}</span>
          <select v-model="selectedDestination" @change="switchDestination">
            <option v-for="item in destinations" :key="item.slug" :value="item.slug">{{ t('pc.dest.' + item.slug + '.name') }}</option>
          </select>
        </label>
        <div class="filter-group">
          <span>{{ t('pc.destination.hotThemes') }}</span>
          <button
            v-for="theme in themes"
            :key="theme.key"
            type="button"
            :class="{ active: keyword === theme.query }"
            @click="keyword = theme.query; loadProducts()"
          >
            {{ t('pc.themes.' + theme.key) }}
          </button>
        </div>
        <button class="wide-button" type="button" @click="loadProducts">{{ t('pc.destination.applyFilter') }}</button>
      </aside>

      <div class="listing-main">
        <div class="listing-toolbar">
          <div>
            <span class="result-count">{{ t('pc.destination.results', { count: products.length }) }}</span>
            <h2>{{ t('pc.dest.' + destination.slug + '.name') }}{{ t('pc.destination.popularSuffix') }}</h2>
          </div>
          <select v-model="sortMode" :aria-label="t('pc.destination.sortAria')">
            <option value="recommended">{{ t('pc.destination.sortRecommended') }}</option>
            <option value="priceLow">{{ t('pc.destination.sortPriceLow') }}</option>
            <option value="priceHigh">{{ t('pc.destination.sortPriceHigh') }}</option>
          </select>
        </div>

        <div v-if="loading" class="state-panel">{{ t('pc.destination.loading') }}</div>
        <div v-else-if="!sortedProducts.length" class="state-panel">
          {{ t('pc.destination.empty') }}
        </div>
        <div v-else class="activity-list">
          <article v-for="product in sortedProducts" :key="product.id" class="activity-row" @click="openProduct(product)">
            <img :src="cover(product)" :alt="productTitle(product)" loading="lazy" />
            <div class="activity-body">
              <div class="meta-line">{{ t('pc.destination.metaLine', { dest: productDestination(product) }) }}</div>
              <h3>{{ productTitle(product) }}</h3>
              <p>{{ productDescription(product) }}</p>
              <div class="activity-tags">
                <span>{{ t('pc.destination.freeCancel') }}</span>
                <span>{{ t('pc.destination.localSupplier') }}</span>
                <span>{{ t('pc.destination.cnEnService') }}</span>
              </div>
              <div class="rating-row">
                <strong>4.8</strong>
                <span>{{ t('pc.destination.ratingStable') }}</span>
              </div>
            </div>
            <div class="activity-price">
              <span>{{ t('pc.destination.fromPerPerson') }}</span>
              <strong>{{ productCurrency(product) }} {{ formatPrice(productPrice(product)) }}</strong>
              <button type="button">{{ t('pc.destination.viewDetail') }}</button>
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
import { useLocale } from '../composables/useLocale.js'
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
const { t } = useLocale()
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
