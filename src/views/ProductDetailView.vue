<template>
  <div id="top" class="page detail-page">
    <div v-if="loading" class="container state-panel detail-state">正在加载产品详情...</div>
    <div v-else-if="!product" class="container state-panel detail-state">商品不存在或已下架。</div>
    <template v-else>
      <section class="container detail-head">
        <div>
          <RouterLink class="breadcrumb" :to="`/destinations/${destinationSlug}`">{{ destinationName }}活动</RouterLink>
          <h1>{{ title }}</h1>
          <div class="detail-meta">
            <strong>4.8</strong>
            <span>128 条评价</span>
            <span>{{ destinationName }}</span>
            <span>电子凭证</span>
          </div>
        </div>
      </section>

      <section class="container media-grid">
        <img class="media-main" :src="cover" :alt="title" />
        <img v-for="image in sideImages" :key="image" :src="image" :alt="title" />
      </section>

      <section class="container detail-layout">
        <article class="detail-content">
          <div class="quick-facts">
            <div>
              <strong>免费取消</strong>
              <span>按产品规则确认</span>
            </div>
            <div>
              <strong>立即确认</strong>
              <span>库存充足时自动确认</span>
            </div>
            <div>
              <strong>本地服务</strong>
              <span>支持中英文沟通</span>
            </div>
          </div>

          <section class="detail-section">
            <h2>体验亮点</h2>
            <ul class="highlight-list">
              <li v-for="item in highlights" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section class="detail-section">
            <h2>完整描述</h2>
            <p>{{ description }}</p>
          </section>

          <section v-if="itinerary.length" class="detail-section">
            <h2>行程安排</h2>
            <div class="timeline">
              <div v-for="(stop, index) in itinerary" :key="stop.id || index" class="timeline-item">
                <span class="timeline-number">{{ index + 1 }}</span>
                <div>
                  <strong>{{ stop.title || stop.pointName || stop.name || `第 ${index + 1} 站` }}</strong>
                  <p>{{ stop.description || stop.desc || stop.duration || '以商户发布的行程信息为准。' }}</p>
                </div>
              </div>
            </div>
          </section>

          <section v-if="product.bookingNotice" class="detail-section">
            <h2>预订须知</h2>
            <p>{{ product.bookingNotice }}</p>
          </section>

          <section v-if="videoUrl" class="detail-section">
            <h2>宣传视频</h2>
            <video v-if="!videoIsHls" :src="videoUrl" controls playsinline preload="metadata" style="width:100%;max-height:480px;border-radius:12px;background:#000"></video>
            <a v-else :href="videoUrl" target="_blank" rel="noopener">播放宣传视频（HLS）▶</a>
          </section>
        </article>

        <aside class="booking-panel">
          <span class="panel-label">每人起</span>
          <div class="panel-price">{{ currency }} {{ priceText }}</div>
          <label>
            <span>选择套餐</span>
            <select v-model="selectedPackageId" @change="loadInventory">
              <option value="">请选择套餐</option>
              <option v-for="pkg in packages" :key="pkg.id" :value="String(pkg.id)">
                {{ pkg.name || pkg.title || pkg.code || `套餐 ${pkg.id}` }}
              </option>
            </select>
          </label>
          <label>
            <span>选择日期</span>
            <select v-model="selectedDate">
              <option value="">请选择日期</option>
              <option v-for="item in inventory" :key="item.date" :value="item.date">
                {{ item.date }} · {{ currency }} {{ formatPrice(item.unitPrice || price) }}
              </option>
            </select>
          </label>
          <label>
            <span>人数</span>
            <input v-model.number="quantity" type="number" min="1" />
          </label>
          <button class="wide-button" type="button" :disabled="!canBook" @click="startBooking">检查可订并预订</button>
          <p class="panel-note">下单页将继续填写联系人和出行人信息，并由后端完成库存预留。</p>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { batchInventory, getProductDetail, getProductItineraryStops, getProductPackages } from '../api.js'
import { destinations } from '../data/middleEast.js'
import {
  formatPrice,
  productCover,
  productCurrency,
  productDescription,
  productDestination,
  productPrice,
  productTitle,
  productVideo,
  splitCsv,
} from '../utils/product.js'
import { resolveMediaList } from '../utils/media.js'

const route = useRoute()
const router = useRouter()
const product = ref(null)
const packages = ref([])
const inventory = ref([])
const itinerary = ref([])
const selectedPackageId = ref('')
const selectedDate = ref('')
const quantity = ref(1)
const loading = ref(false)

const title = computed(() => productTitle(product.value))
const description = computed(() => productDescription(product.value))
const destinationName = computed(() => productDestination(product.value))
const destinationSlug = computed(() => {
  const found = destinations.find((item) => item.name.toLowerCase() === destinationName.value.toLowerCase())
  return found?.slug || 'dubai'
})
const fallbackImage = computed(() => destinations.find((item) => item.slug === destinationSlug.value)?.image || destinations[0].image)
const cover = computed(() => productCover(product.value, fallbackImage.value))
const gallery = computed(() => {
  const images = [cover.value, ...resolveMediaList(splitCsv(product.value?.images))].filter(Boolean)
  return [...new Set(images)]
})
const sideImages = computed(() => {
  const existing = gallery.value.slice(1, 5)
  while (existing.length < 4) existing.push(fallbackImage.value)
  return existing
})
const highlights = computed(() => {
  const items = splitCsv(product.value?.highlights)
  if (items.length) return items
  return ['专业本地向导或供应商服务', '适合中东自由行与家庭出游', '订单确认后可在线查看凭证']
})
const price = computed(() => productPrice(product.value))
const currency = computed(() => productCurrency(product.value))
const priceText = computed(() => formatPrice(price.value))
const videoUrl = computed(() => productVideo(product.value))
const videoIsHls = computed(() => /\.m3u8($|\?)/i.test(videoUrl.value))
const canBook = computed(() => selectedPackageId.value && selectedDate.value && quantity.value > 0)

function nextDate(offset) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

async function loadInventory() {
  inventory.value = []
  if (!selectedPackageId.value) return
  try {
    inventory.value = await batchInventory({
      packageId: selectedPackageId.value,
      startDate: nextDate(1),
      endDate: nextDate(30),
    })
    if (inventory.value.length && !selectedDate.value) {
      selectedDate.value = inventory.value[0].date
    }
  } catch (error) {
    console.error('加载库存失败', error)
  }
}

function startBooking() {
  router.push({
    path: '/',
    query: {
      bookingProductId: product.value.id,
      packageId: selectedPackageId.value,
      date: selectedDate.value,
      quantity: quantity.value,
    },
  })
}

async function load() {
  loading.value = true
  try {
    product.value = await getProductDetail(route.params.id)
    const [packageItems, itineraryItems] = await Promise.all([
      getProductPackages(route.params.id).catch(() => []),
      getProductItineraryStops(route.params.id).catch(() => []),
    ])
    packages.value = packageItems.filter((item) => !item.status || item.status === 'ACTIVE')
    itinerary.value = itineraryItems
    if (packages.value.length) {
      selectedPackageId.value = String(packages.value[0].id)
      await loadInventory()
    }
  } catch (error) {
    console.error('加载产品详情失败', error)
    product.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
