<template>
  <div id="top" class="page detail-page">
    <div v-if="loading" class="container state-panel detail-state">{{ t('pc.attractions.loading') }}</div>
    <div v-else-if="!attraction" class="container state-panel detail-state">{{ t('pc.attractions.notFound') }}</div>
    <template v-else>
      <section class="container detail-head">
        <div>
          <RouterLink class="breadcrumb" to="/attractions">{{ t('pc.attractions.title') }}</RouterLink>
          <h1>{{ title }}</h1>
          <div class="detail-meta">
            <span v-if="attraction.city">📍 {{ attraction.city }}</span>
            <span v-if="attraction.category">{{ categoryLabel }}</span>
            <span v-if="nameAlt">{{ nameAlt }}</span>
          </div>
        </div>
      </section>

      <section v-if="gallery.length" class="container media-grid attraction-media">
        <img class="media-main" :src="gallery[0]" :alt="title" />
        <img v-for="(image, index) in gallery.slice(1, 5)" :key="image" :src="image" :alt="`${title} ${index + 2}`" loading="lazy" />
      </section>

      <section class="container detail-layout">
        <article class="detail-content">
          <section v-if="attraction.description" class="detail-section">
            <h2>{{ t('pc.attractions.description') }}</h2>
            <p>{{ attraction.description }}</p>
          </section>

          <section class="detail-section">
            <h2>{{ t('pc.attractions.routes', { count: products.length }) }}</h2>
            <div v-if="productsLoading" class="state-panel">{{ t('pc.attractions.routesLoading') }}</div>
            <div v-else-if="!products.length" class="state-panel">{{ t('pc.attractions.routesEmpty') }}</div>
            <div v-else class="product-grid">
              <ProductCard
                v-for="product in products"
                :key="product.id"
                :product="product"
                :fallback-image="fallbackImage"
                @open="openProduct"
              />
            </div>
          </section>
        </article>

        <aside class="filters-panel attraction-side">
          <h2>{{ t('pc.attractions.info') }}</h2>
          <ul class="attraction-meta">
            <li v-if="attraction.openingHours">🕐 {{ t('pc.attractions.openingHours') }}: {{ attraction.openingHours }}</li>
            <li v-if="attraction.suggestedDuration">⏱ {{ t('pc.attractions.suggestedDuration') }}: {{ attraction.suggestedDuration }}</li>
            <li v-if="attraction.ticketInfo">🎟 {{ t('pc.attractions.ticketInfo') }}: {{ attraction.ticketInfo }}</li>
            <li v-if="attraction.address">📍 {{ [attraction.city, attraction.address].filter(Boolean).join(' · ') }}</li>
          </ul>
          <div v-if="tags.length" class="filter-group attraction-side-tags">
            <span>{{ t('pc.attractions.tagsLabel') }}</span>
            <div class="attraction-tags">
              <span v-for="tag in tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <a
            v-if="coords"
            class="attraction-map"
            :href="`https://www.google.com/maps?q=${coords}`"
            target="_blank"
            rel="noopener"
          >🗺 {{ t('pc.attractions.mapLink') }}</a>
          <RouterLink v-if="products.length" class="wide-button attraction-routes-cta" :to="`/destinations/${destinationSlug}`">
            {{ t('pc.attractions.browseDest') }}
          </RouterLink>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getAttractionDetail, getAttractionProducts } from '../api.js'
import ProductCard from '../components/ProductCard.vue'
import { destinationBySlug, destinations } from '../data/middleEast.js'
import { useLocale } from '../composables/useLocale.js'
import { productDestination } from '../utils/product.js'
import { attractionCoords, attractionCover, attractionImages, attractionTags, attractionTitle } from '../utils/attraction.js'

const route = useRoute()
const router = useRouter()
const { t, te, locale } = useLocale()

const attraction = ref(null)
const products = ref([])
const loading = ref(false)
const productsLoading = ref(false)
/** 请求序号：快速切换景点时只采用最后一次结果 */
let loadSeq = 0

const title = computed(() => attractionTitle(attraction.value, locale.value))
const nameEn = computed(() => attraction.value?.nameEn || '')
// 副标题对照名：后端已按语言解析 name，仅中文界面额外展示英文名作参考；
// 英/阿模式下 title 已是本地化名，不再重复展示。
const nameAlt = computed(() => {
  const a = attraction.value
  if (!a || locale.value !== 'zh-CN') return ''
  return nameEn.value && nameEn.value !== a.name ? nameEn.value : ''
})
const tags = computed(() => attractionTags(attraction.value))
const coords = computed(() => attractionCoords(attraction.value))
const categoryLabel = computed(() => {
  const category = attraction.value?.category
  if (!category) return ''
  return te(`pc.attractions.categories.${category}`) ? t(`pc.attractions.categories.${category}`) : category
})

/** 图集：封面在前，其余图片集跟在后面 */
const gallery = computed(() => {
  const images = [attractionCover(attraction.value), ...attractionImages(attraction.value)].filter(Boolean)
  return [...new Set(images)]
})

/** 线路兜底图与目的地：优先取关联产品目的地，默认迪拜 */
const destinationSlug = computed(() => {
  const dest = String(productDestination(products.value[0] || {})).toLowerCase()
  const found = destinations.find((item) => item.name.toLowerCase() === dest)
  return found?.slug || 'dubai'
})
const fallbackImage = computed(() => destinationBySlug(destinationSlug.value).image)

function openProduct(product) {
  router.push({ name: 'ProductDetail', params: { id: product.id } })
}

async function loadAll() {
  const seq = ++loadSeq
  const id = route.params.id
  loading.value = true
  attraction.value = null
  products.value = []
  try {
    const detail = await getAttractionDetail(id)
    if (seq !== loadSeq) return
    attraction.value = detail
    productsLoading.value = true
    try {
      const items = await getAttractionProducts(id)
      if (seq === loadSeq) products.value = items
    } catch (error) {
      console.error('加载景点关联线路失败', error)
      if (seq === loadSeq) products.value = []
    } finally {
      if (seq === loadSeq) productsLoading.value = false
    }
  } catch (error) {
    if (seq !== loadSeq) return
    console.error('加载景点详情失败', error)
    attraction.value = null
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

watch(() => route.params.id, loadAll)
onMounted(loadAll)
</script>

<style scoped>
/* 景点图不足 5 张时，图集网格不再出现灰底空白块（产品图集保持原样） */
.attraction-media {
  background: transparent;
}

.attraction-side {
  align-self: start;
}

.attraction-side-tags {
  margin-top: 14px;
}

.attraction-routes-cta {
  display: block;
  margin-top: 16px;
  text-align: center;
}
</style>
