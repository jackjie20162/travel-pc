<template>
  <div id="top" class="page detail-page">
    <div v-if="loading" class="container state-panel detail-state">{{ t('pc.product.loading') }}</div>
    <div v-else-if="!product" class="container state-panel detail-state">{{ t('pc.product.notFound') }}</div>
    <template v-else>
      <section class="container detail-head">
        <div>
          <RouterLink class="breadcrumb" :to="`/destinations/${destinationSlug}`">{{ destinationName }}{{ t('pc.product.activitiesSuffix') }}</RouterLink>
          <h1>{{ title }}</h1>
          <div class="detail-meta">
            <strong>4.8</strong>
            <span>{{ t('pc.product.reviewCount') }}</span>
            <span>{{ destinationName }}</span>
            <span>{{ t('pc.product.eVoucher') }}</span>
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
              <strong>{{ t('pc.product.freeCancel') }}</strong>
              <span>{{ t('pc.product.freeCancelDesc') }}</span>
            </div>
            <div>
              <strong>{{ t('pc.product.instantConfirm') }}</strong>
              <span>{{ t('pc.product.instantConfirmDesc') }}</span>
            </div>
            <div>
              <strong>{{ t('pc.product.localService') }}</strong>
              <span>{{ t('pc.product.localServiceDesc') }}</span>
            </div>
          </div>

          <section class="detail-section">
            <h2>{{ t('pc.product.highlights') }}</h2>
            <ul class="highlight-list">
              <li v-for="item in highlights" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section class="detail-section">
            <h2>{{ t('pc.product.description') }}</h2>
            <p>{{ description }}</p>
          </section>

          <section v-if="itinerary.length" class="detail-section">
            <h2>{{ t('pc.product.itinerary') }}</h2>
            <div class="timeline">
              <div v-for="(stop, index) in itinerary" :key="stop.id || index" class="timeline-item">
                <span class="timeline-number">{{ index + 1 }}</span>
                <div>
                  <strong>{{ stop.title || stop.pointName || stop.name || t('pc.product.stopDefault', { index: index + 1 }) }}</strong>
                  <p>{{ stop.description || stop.desc || stop.duration || t('pc.product.itineraryFallback') }}</p>
                </div>
              </div>
            </div>
          </section>

          <section v-if="product.bookingNotice" class="detail-section">
            <h2>{{ t('pc.product.bookingNotice') }}</h2>
            <p>{{ product.bookingNotice }}</p>
          </section>

          <section v-if="videoUrl" class="detail-section">
            <h2>{{ t('pc.product.video') }}</h2>
            <video v-if="!videoIsHls" :src="videoUrl" controls playsinline preload="metadata" style="width:100%;max-height:480px;border-radius:12px;background:#000"></video>
            <a v-else :href="videoUrl" target="_blank" rel="noopener">{{ t('pc.product.videoHls') }}</a>
          </section>
        </article>

        <!-- 预订面板：与 travel-app 一致的 套餐 → 日期 → 人数 选择链路 -->
        <aside class="booking-panel">
          <div class="panel-price-line">
            <span class="panel-label">{{ t('pc.product.fromPerPerson') }}</span>
            <strong class="panel-price">{{ minPriceText }}</strong>
          </div>

          <div class="panel-group">
            <span class="panel-group-title">{{ t('pc.product.selectPackage') }}</span>
            <div class="pkg-list">
              <button
                v-for="pkg in packages"
                :key="pkg.id"
                type="button"
                class="pkg-item"
                :class="{ active: String(pkg.id) === String(selectedPackageId) }"
                @click="selectPkg(pkg)"
              >
                <span class="pkg-name">{{ pkg.name || pkg.title || pkg.code || t('pc.product.pkgDefault', { id: pkg.id }) }}</span>
                <span v-if="pkg.description" class="pkg-desc">{{ pkg.description }}</span>
              </button>
              <div v-if="!packages.length" class="pkg-empty">{{ t('pc.product.pkgEmpty') }}</div>
            </div>
          </div>

          <div class="panel-group">
            <span class="panel-group-title">{{ t('pc.product.selectDate') }}</span>
            <div v-if="inventoryLoading" class="date-loading">{{ t('pc.product.dateLoading') }}</div>
            <div v-else class="pc-date-strip">
              <button
                v-for="d in dateStrip"
                :key="d.dateStr"
                type="button"
                class="date-cell"
                :class="{ selected: selectedDate === d.dateStr, unavailable: !d.available }"
                :disabled="!d.available"
                @click="selectDate(d.dateStr)"
              >
                <span class="dc-weekday">{{ d.weekday }}</span>
                <span class="dc-day">{{ d.day }}</span>
                <span class="dc-price">{{ d.price != null ? formatPrice(d.price, d.currency) : '·' }}</span>
              </button>
            </div>
            <p v-if="selectedInventory" class="dc-hint">
              {{ t('pc.product.remainingHint', { remaining, max: maxQty }) }}
            </p>
          </div>

          <div class="panel-group">
            <span class="panel-group-title">{{ t('pc.product.people') }}</span>
            <div class="pc-stepper">
              <button type="button" class="stepper-btn" :disabled="quantity <= 1" @click="decreaseQty">−</button>
              <span class="stepper-value">{{ quantity }}</span>
              <button type="button" class="stepper-btn" :disabled="quantity >= maxQty" @click="increaseQty">+</button>
              <span class="stepper-total">{{ t('pc.product.totalLabel', { amount: totalText }) }}</span>
            </div>
          </div>

          <button class="wide-button" type="button" :disabled="!canBook" @click="goBooking">
            {{ selectedDate && selectedPackageId ? t('pc.product.bookNow') : t('pc.product.selectPkgDate') }}
          </button>
          <button class="wide-button ghost" type="button" @click="consultSupport">{{ t('pc.product.consultSupport') }}</button>
          <p class="panel-note">{{ t('pc.product.panelNote') }}</p>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { batchInventory, getProductDetail, getProductItineraryStops, getProductPackages } from '../api.js'
import { useUser } from '../composables/user.js'
import { destinations } from '../data/middleEast.js'
import { useLocale } from '../composables/useLocale.js'
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
import { imOpenSupport } from '../plugin/im/imStore'

const route = useRoute()
const router = useRouter()
const user = useUser()
const { t, tm } = useLocale()

const product = ref(null)
const packages = ref([])
const itinerary = ref([])
const selectedPackageId = ref('')
const selectedDate = ref('')
const selectedInventory = ref(null)
const quantity = ref(1)
const loading = ref(false)
const inventoryLoading = ref(false)

/** 库存缓存: { dateStr: inventoryItem }，字段与 batchInventory 返回一致 */
const inventoryCache = ref({})

const WEEKDAYS = computed(() => {
  const days = tm('pc.product.weekday')
  return Array.isArray(days) ? days : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
})

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
  return [
    t('pc.product.highlightFallback1'),
    t('pc.product.highlightFallback2'),
    t('pc.product.highlightFallback3'),
  ]
})
const price = computed(() => productPrice(product.value))
const currency = computed(() => productCurrency(product.value))
const videoUrl = computed(() => productVideo(product.value))
const videoIsHls = computed(() => /\.m3u8($|\?)/i.test(videoUrl.value))

/** 起价：优先取库存最低价，回退产品 minPrice */
const minPriceText = computed(() => {
  const prices = Object.values(inventoryCache.value)
    .map((i) => i.unitPrice)
    .filter((p) => p != null && p > 0)
  if (prices.length) {
    const invMin = Math.min(...prices)
    if (!price.value || price.value <= 0) return formatPrice(invMin, currency.value)
    return formatPrice(price.value, currency.value)
  }
  return formatPrice(price.value, currency.value)
})

/** 当日剩余可订量（无库存明细时给默认上限 8） */
const remaining = computed(() => {
  const inv = selectedInventory.value
  if (!inv) return maxQty.value
  const left = (inv.capacity ?? 0) - (inv.reserved ?? 0)
  return left > 0 ? left : 0
})

const maxQty = computed(() => {
  const inv = selectedInventory.value
  if (!inv) return 8
  const left = (inv.capacity ?? 0) - (inv.reserved ?? 0)
  return left > 0 ? Math.min(left, 8) : 1
})

const totalText = computed(() => {
  const unit = selectedInventory.value?.unitPrice ?? price.value
  return formatPrice(unit * quantity.value, selectedInventory.value?.currency || currency.value)
})

/** 生成日期条数据（今天起 14 天，与 travel-app 逻辑一致：无库存记录不代表不可订，isOpen=false 才置灰） */
const dateStrip = computed(() => {
  const days = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const inv = inventoryCache.value[dateStr]
    const available = !!selectedPackageId.value && (!inv || inv.isOpen !== false)
    days.push({
      dateStr,
      weekday: WEEKDAYS.value[d.getDay()],
      day: d.getDate(),
      price: inv ? inv.unitPrice : null,
      currency: inv ? inv.currency : null,
      available,
    })
  }
  return days
})

const canBook = computed(() => !!selectedPackageId.value && !!selectedDate.value && quantity.value > 0)

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

/** 加载所选套餐今天起 30 天的库存窗口 */
async function loadInventoryWindow() {
  if (!selectedPackageId.value) return
  inventoryLoading.value = true
  inventoryCache.value = {}
  selectedInventory.value = null
  selectedDate.value = ''
  const start = new Date()
  const end = new Date()
  end.setDate(start.getDate() + 30)
  try {
    const items = await batchInventory({
      packageId: selectedPackageId.value,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    })
    const cache = {}
    for (const item of items) cache[item.date] = item
    inventoryCache.value = cache
    // 默认选中最近可订日期
    const first = dateStrip.value.find((d) => d.available)
    if (first) selectDate(first.dateStr)
  } catch (error) {
    console.error('加载库存失败', error)
  } finally {
    inventoryLoading.value = false
  }
}

function selectPkg(pkg) {
  selectedPackageId.value = String(pkg.id)
  loadInventoryWindow()
}

function selectDate(dateStr) {
  selectedDate.value = dateStr
  selectedInventory.value = inventoryCache.value[dateStr] || null
  quantity.value = Math.min(quantity.value, maxQty.value) || 1
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

function increaseQty() {
  if (quantity.value < maxQty.value) quantity.value++
}

/** 与 travel-app 一致：仅传 ID，价格/上限由下单页通过库存接口再确认 */
function goBooking() {
  if (!canBook.value) return
  if (!user.isLoggedIn.value) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  const query = {
    productId: product.value.id,
    packageId: selectedPackageId.value,
    date: selectedDate.value,
    quantity: quantity.value,
  }
  if (selectedInventory.value?.id) query.inventoryId = selectedInventory.value.id
  router.push({ name: 'Booking', query })
}

/** 咨询客服：打开 IM 抽屉并自动发送当前商品卡片（contentType=3） */
function consultSupport() {
  if (!user.isLoggedIn.value) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  imOpenSupport({
    product: {
      id: product.value.id,
      title: title.value,
      coverImage: cover.value,
      minPrice: price.value,
      destination: destinationName.value,
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
      await loadInventoryWindow()
    }
    // 支持带参直达：/products/:id?pkg=&date= 用于分享或回跳
    applyRouteQuery()
  } catch (error) {
    console.error('加载产品详情失败', error)
    product.value = null
  } finally {
    loading.value = false
  }
}

function applyRouteQuery() {
  const { pkg, date } = route.query
  if (pkg && packages.value.some((p) => String(p.id) === String(pkg))) {
    if (String(pkg) !== selectedPackageId.value) {
      const target = packages.value.find((p) => String(p.id) === String(pkg))
      selectedPackageId.value = String(pkg)
      loadInventoryWindow().then(() => {
        if (date && inventoryCache.value[date]) selectDate(date)
      })
      return
    }
  }
  if (date && selectedDate.value !== date) {
    const target = dateStrip.value.find((d) => d.dateStr === date && d.available)
    if (target) selectDate(date)
  }
  // 兜底：确保 selectedDate 至少落在今天之后
  if (!selectedDate.value && dateStrip.value.some((d) => d.available)) {
    selectDate(dateStrip.value.find((d) => d.available && d.dateStr >= todayStr()).dateStr)
  }
}

onMounted(load)
</script>
