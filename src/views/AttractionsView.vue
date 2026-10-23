<template>
  <div id="top" class="page muted-page">
    <section class="container listing-layout">
      <aside class="filters-panel">
        <h2>{{ t('pc.destination.filter') }}</h2>
        <label>
          <span>{{ t('pc.destination.keyword') }}</span>
          <input v-model="keyword" :placeholder="t('pc.attractions.keywordPh')" @keyup.enter="goPage(1)" />
        </label>
        <div class="filter-group">
          <span>{{ t('pc.attractions.category') }}</span>
          <button
            v-for="key in categoryKeys"
            :key="key || 'all'"
            type="button"
            :class="{ active: selectedCategory === key }"
            @click="selectedCategory = key; goPage(1)"
          >
            {{ key ? t('pc.attractions.categories.' + key) : t('pc.attractions.allCategories') }}
          </button>
        </div>
        <button class="wide-button" type="button" @click="goPage(1)">{{ t('pc.destination.applyFilter') }}</button>
      </aside>

      <div class="listing-main">
        <div class="listing-toolbar">
          <div>
            <span class="result-count">{{ t('pc.destination.results', { count: total }) }}</span>
            <h2>{{ t('pc.attractions.title') }}</h2>
          </div>
        </div>

        <div v-if="loading" class="state-panel">{{ t('pc.attractions.loading') }}</div>
        <div v-else-if="!attractions.length" class="state-panel">{{ t('pc.attractions.empty') }}</div>
        <template v-else>
          <div class="attraction-grid">
            <article
              v-for="a in attractions"
              :key="a.id"
              class="attraction-card attraction-card-link"
              @click="openAttraction(a)"
            >
              <img v-if="cover(a)" class="attraction-img" :src="cover(a)" :alt="name(a)" loading="lazy" />
              <div v-else class="attraction-img attraction-img-empty"></div>
              <div class="attraction-body">
                <strong class="attraction-name">{{ name(a) }}</strong>
                <span v-if="nameAlt(a)" class="attraction-en">{{ nameAlt(a) }}</span>
                <p v-if="a.description" class="attraction-desc">{{ a.description }}</p>
                <div v-if="tags(a).length" class="attraction-tags">
                  <span v-for="tag in tags(a)" :key="tag">{{ tag }}</span>
                </div>
                <ul class="attraction-meta">
                  <li v-if="a.city || a.address">📍 {{ [a.city, a.address].filter(Boolean).join(' · ') }}</li>
                  <li v-if="a.openingHours">🕐 {{ t('pc.attractions.openingHours') }}: {{ a.openingHours }}</li>
                  <li v-if="a.suggestedDuration">⏱ {{ t('pc.attractions.suggestedDuration') }}: {{ a.suggestedDuration }}</li>
                </ul>
              </div>
            </article>
          </div>

          <div v-if="totalPages > 1" class="date-pager attractions-pager">
            <button type="button" class="pager-btn" :disabled="page <= 1" @click="goPage(page - 1)">‹ {{ t('pc.attractions.prevPage') }}</button>
            <span class="pager-range">{{ t('pc.attractions.pageInfo', { page, pages: totalPages, total }) }}</span>
            <button type="button" class="pager-btn" :disabled="page >= totalPages" @click="goPage(page + 1)">{{ t('pc.attractions.nextPage') }} ›</button>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAttractions } from '../api.js'
import { useLocale } from '../composables/useLocale.js'
import { attractionCover, attractionTags, attractionTitle } from '../utils/attraction.js'

const route = useRoute()
const router = useRouter()
const { t, locale } = useLocale()

const PAGE_SIZE = 12
const categoryKeys = ['', 'NATURE', 'HISTORY', 'THEME_PARK', 'MUSEUM', 'RELIGION', 'SHOPPING', 'OTHER']

const keyword = ref(route.query.keyword || '')
const selectedCategory = ref(route.query.category || '')
const attractions = ref([])
const total = ref(0)
const page = ref(Number(route.query.page) || 1)
const loading = ref(false)
/** 请求序号：防止在途旧响应覆盖新条件下的结果 */
let loadSeq = 0

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

function name(a) {
  return attractionTitle(a, locale.value)
}

function nameAlt(a) {
  // 中文界面展示英文名对照，其他语言不重复展示
  return locale.value === 'zh-CN' && a.nameEn && a.nameEn !== a.name ? a.nameEn : ''
}

function cover(a) {
  return attractionCover(a)
}

function tags(a) {
  return attractionTags(a).slice(0, 3)
}

function openAttraction(a) {
  router.push({ name: 'AttractionDetail', params: { id: a.id } })
}

async function load() {
  // 并发保护：并发点击/翻页时只采用最后一次请求的结果，避免旧响应覆盖新筛选条件
  const seq = ++loadSeq
  loading.value = true
  try {
    const data = await getAttractions({
      keyword: keyword.value || undefined,
      category: selectedCategory.value || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    if (seq !== loadSeq) return
    attractions.value = data.items
    total.value = Number(data.total) || data.items.length
  } catch (error) {
    if (seq !== loadSeq) return
    console.error('加载景点列表失败', error)
    attractions.value = []
    total.value = 0
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function goPage(next) {
  page.value = Math.max(1, next)
  syncRoute()
  load()
}

function syncRoute() {
  const query = {}
  if (keyword.value) query.keyword = keyword.value
  if (selectedCategory.value) query.category = selectedCategory.value
  if (page.value > 1) query.page = String(page.value)
  router.replace({ name: 'Attractions', query }).catch(() => { /* 与当前地址相同 */ })
}

// 头部搜索等外部跳转（URL 变化但非本页操作触发）时同步条件并重查
watch(
  () => [route.query.keyword, route.query.category, route.query.page],
  () => {
    if (route.name !== 'Attractions') return
    const nextKeyword = route.query.keyword || ''
    const nextCategory = route.query.category || ''
    const nextPage = Number(route.query.page) || 1
    if (nextKeyword === keyword.value && nextCategory === selectedCategory.value && nextPage === page.value) return
    keyword.value = nextKeyword
    selectedCategory.value = nextCategory
    page.value = nextPage
    load()
  },
)

// 切换界面语言时按新 locale 重新取数：后端按 Accept-Language 解析译文，不重拉会残留上一语言的数据
watch(locale, () => load())

onMounted(load)
</script>

<style scoped>
.attractions-pager {
  justify-content: center;
  margin-top: 20px;
}
</style>
