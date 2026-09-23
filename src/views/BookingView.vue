<template>
  <div class="page booking-page">
    <div class="container">
      <!-- 步骤条：与 travel-app 一致 选择 → 确认 → 支付 -->
      <div class="pc-stepper-nav">
        <span class="step done">1 {{ t('pc.booking.step1') }}</span>
        <i class="step-line"></i>
        <span class="step current">2 {{ t('pc.booking.step2') }}</span>
        <i class="step-line"></i>
        <span class="step">3 {{ t('pc.booking.step3') }}</span>
      </div>

      <div v-if="loading" class="state-panel">{{ t('pc.booking.loadingProduct') }}</div>
      <div v-else-if="loadError" class="state-panel">
        <p>{{ loadError }}</p>
        <button class="text-link" type="button" @click="goBackToProduct">{{ t('pc.booking.backToProduct') }}</button>
      </div>
      <template v-else>
        <div class="booking-layout">
          <div class="booking-main">
            <!-- 产品标题 + 退订政策 -->
            <div class="booking-product-header">
              <h1>{{ productTitle }}</h1>
              <button type="button" class="cancel-policy-link" @click="showCancelPolicy = !showCancelPolicy">
                {{ t('pc.booking.cancelPolicy') }} {{ showCancelPolicy ? '∧' : '>' }}
              </button>
            </div>
            <div v-if="showCancelPolicy" class="cancel-policy-detail">
              <p v-for="(line, i) in cancelPolicyDetail" :key="i">{{ line }}</p>
            </div>

            <!-- 游客信息 -->
            <section class="pc-card">
              <div class="pc-card-header">
                <h3>{{ t('pc.booking.travelerInfo') }} <small>{{ t('pc.booking.travelerTotal', { count: travelers.length }) }}</small></h3>
                <div class="header-actions">
                  <button type="button" class="btn-ghost" @click="openTravelersModal">{{ t('pc.booking.selectSaved') }}</button>
                  <button type="button" class="btn-ghost" @click="addTraveler">{{ t('pc.booking.addTraveler') }}</button>
                </div>
              </div>

              <div v-for="(traveler, idx) in travelers" :key="idx" class="traveler-card">
                <div class="traveler-card-header">
                  <span class="traveler-index">{{ t('pc.booking.travelerLabel', { index: idx + 1 }) }}</span>
                  <button v-if="travelers.length > 1" type="button" class="btn-remove-traveler" @click="removeTraveler(idx)">{{ t('pc.booking.delete') }}</button>
                </div>
                <div class="pc-form-grid">
                  <label class="pc-form-item">
                    <span>{{ t('pc.booking.idType') }}</span>
                    <select v-model="traveler.idType">
                      <option value="passport">{{ t('pc.booking.idTypes.passport') }}</option>
                      <option value="id_card">{{ t('pc.booking.idTypes.id_card') }}</option>
                      <option value="other_id">{{ t('pc.booking.idTypes.other_id') }}</option>
                    </select>
                  </label>
                  <label class="pc-form-item">
                    <span>{{ t('pc.booking.nameLabel', { lang: nameLangLabel(traveler.nameLang) }) }}<em>*</em></span>
                    <div class="name-input-row">
                      <input
                        v-model="traveler.name"
                        :placeholder="namePlaceholder(traveler.nameLang)"
                        :dir="traveler.nameLang === 'ar' ? 'rtl' : 'ltr'"
                      />
                      <div class="lang-toggles">
                        <button
                          v-for="lang in ['zh', 'en', 'ar']"
                          :key="lang"
                          type="button"
                          :class="['lang-btn', { active: traveler.nameLang === lang }]"
                          @click="traveler.nameLang = lang"
                        >{{ langLabel(lang) }}</button>
                      </div>
                    </div>
                  </label>
                  <label class="pc-form-item">
                    <span>{{ t('pc.booking.idNumber') }}</span>
                    <input
                      v-model="traveler.idNumber"
                      :placeholder="idNumberPlaceholder(traveler.idType)"
                      :dir="traveler.nameLang === 'ar' ? 'rtl' : 'ltr'"
                    />
                  </label>
                  <label class="pc-form-item">
                    <span>{{ t('pc.booking.phone') }}</span>
                    <input v-model="traveler.phone" type="tel" :placeholder="t('pc.booking.phonePh')" :dir="traveler.nameLang === 'ar' ? 'rtl' : 'ltr'" />
                  </label>
                </div>
              </div>
            </section>

            <!-- 联系人信息 -->
            <section class="pc-card">
              <div class="pc-card-header">
                <h3>{{ t('pc.booking.contactInfo') }}</h3>
                <button type="button" class="btn-ghost" @click="openContactsModal">{{ t('pc.booking.savedContacts') }}</button>
              </div>
              <div class="pc-form-grid">
                <label class="pc-form-item">
                  <span>{{ t('pc.booking.contactName') }} <em>*</em></span>
                  <input v-model="contact.name" :placeholder="t('pc.booking.contactNamePh')" />
                </label>
                <label class="pc-form-item">
                  <span>{{ t('pc.booking.contactEmail') }} <em>*</em></span>
                  <input v-model="contact.email" type="email" :placeholder="t('pc.booking.contactEmailPh')" />
                </label>
                <label class="pc-form-item">
                  <span>{{ t('pc.booking.contactPhone') }}</span>
                  <input v-model="contact.phone" type="tel" :placeholder="t('pc.booking.contactPhonePh')" />
                </label>
              </div>
            </section>

            <!-- 特殊需求 -->
            <section class="pc-card">
              <div class="pc-card-header"><h3>{{ t('pc.booking.specialNeeds') }}</h3></div>
              <textarea v-model="remark" rows="3" :placeholder="t('pc.booking.remarkPh')"></textarea>
            </section>

            <!-- 预订须知 -->
            <section class="pc-card notice">
              <div class="pc-card-header"><h3>{{ t('pc.booking.importantNotice') }}</h3></div>
              <ul>
                <li>{{ t('pc.booking.notice1') }}</li>
                <li>{{ t('pc.booking.notice2') }}</li>
                <li>{{ t('pc.booking.notice3') }}</li>
                <li>{{ t('pc.booking.notice4') }}</li>
              </ul>
            </section>
          </div>

          <!-- 右侧粘性订单摘要 -->
          <aside class="pc-card booking-summary">
            <h3>{{ t('pc.booking.summary') }}</h3>
            <div class="summary-line"><span>{{ productTitle }}</span></div>
            <div v-if="packageName" class="summary-line muted"><span>{{ t('pc.booking.packageLabel', { name: packageName }) }}</span></div>
            <div class="summary-line muted"><span>{{ t('pc.booking.travelDate') }}</span><span>{{ date }}</span></div>
            <div class="summary-line">
              <span>{{ t('pc.booking.people') }}</span>
              <b>{{ travelers.length }}</b>
            </div>
            <div class="summary-line price"><span>{{ t('pc.booking.unitPrice') }}</span><span>{{ priceText(unitPrice) }}</span></div>
            <div class="summary-line total">
              <span>{{ t('pc.booking.total') }}</span>
              <strong>{{ priceText(totalAmount) }}</strong>
            </div>
            <button class="wide-button" type="button" :disabled="submitting || !canSubmit" @click="submitOrder">
              {{ submitting ? t('pc.booking.submitting') : t('pc.booking.confirmOrder', { amount: priceText(totalAmount) }) }}
            </button>
            <p class="panel-note">{{ t('pc.booking.panelNote') }}</p>
          </aside>
        </div>

        <div v-if="error" class="pc-error-toast">{{ error }}</div>
      </template>
    </div>

    <!-- 常用出行人管理弹窗 -->
    <div v-if="showTravelersModal" class="pc-modal-overlay" @click.self="showTravelersModal = false">
      <div class="pc-modal">
        <div class="pc-modal-header">
          <h3>{{ t('pc.booking.savedTravelers') }}</h3>
          <button type="button" class="modal-close" @click="showTravelersModal = false">✕</button>
        </div>
        <div v-if="savedTravelers.length === 0" class="modal-empty">{{ t('pc.booking.noSavedTravelers') }}</div>
        <div v-else class="saved-list">
          <div v-for="st in savedTravelers" :key="st.id" class="saved-item" @click="selectSavedTraveler(st)">
            <div class="saved-item-info">
              <span class="saved-item-name">{{ st.name }}</span>
              <span class="saved-item-detail">{{ idTypeLabel(st.idType) }} {{ st.idNumber }} · {{ st.phone }}</span>
            </div>
            <div class="saved-item-actions">
              <button type="button" class="btn-ghost" @click.stop="startEditSavedTraveler(st)">{{ t('common.edit') }}</button>
              <button type="button" class="btn-ghost danger" @click.stop="deleteSavedTraveler(st.id)">{{ t('pc.booking.delete') }}</button>
            </div>
          </div>
        </div>
        <div class="modal-form">
          <h4>{{ editingTravelerIdx >= 0 ? t('pc.booking.editTraveler') : t('pc.booking.newTraveler') }}</h4>
          <div class="pc-form-grid">
            <label class="pc-form-item"><span>{{ t('pc.booking.name') }}</span><input v-model="travelerForm.name" :placeholder="t('pc.booking.namePhInput')" /></label>
            <label class="pc-form-item">
              <span>{{ t('pc.booking.idType') }}</span>
              <select v-model="travelerForm.idType">
                <option value="passport">{{ t('pc.booking.idTypes.passport') }}</option>
                <option value="id_card">{{ t('pc.booking.idTypes.id_card') }}</option>
                <option value="other_id">{{ t('pc.booking.idTypes.other_id') }}</option>
              </select>
            </label>
            <label class="pc-form-item"><span>{{ t('pc.booking.idNumber') }}</span><input v-model="travelerForm.idNumber" :placeholder="t('pc.booking.idNumberInput')" /></label>
            <label class="pc-form-item"><span>{{ t('pc.booking.phone') }}</span><input v-model="travelerForm.phone" type="tel" :placeholder="t('pc.booking.phoneInput')" /></label>
          </div>
          <button type="button" class="btn-ghost primary" @click="saveTravelerForm">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <!-- 常用联系人管理弹窗 -->
    <div v-if="showContactsModal" class="pc-modal-overlay" @click.self="showContactsModal = false">
      <div class="pc-modal">
        <div class="pc-modal-header">
          <h3>{{ t('pc.booking.savedContacts') }}</h3>
          <button type="button" class="modal-close" @click="showContactsModal = false">✕</button>
        </div>
        <div v-if="savedContacts.length === 0" class="modal-empty">{{ t('pc.booking.noSavedContacts') }}</div>
        <div v-else class="saved-list">
          <div v-for="sc in savedContacts" :key="sc.id" class="saved-item" @click="selectSavedContact(sc)">
            <div class="saved-item-info">
              <span class="saved-item-name">{{ sc.name }}</span>
              <span class="saved-item-detail">{{ sc.email }} · {{ sc.phone }}</span>
            </div>
            <div class="saved-item-actions">
              <button type="button" class="btn-ghost" @click.stop="startEditSavedContact(sc)">{{ t('common.edit') }}</button>
              <button type="button" class="btn-ghost danger" @click.stop="deleteSavedContact(sc.id)">{{ t('pc.booking.delete') }}</button>
            </div>
          </div>
        </div>
        <div class="modal-form">
          <h4>{{ editingContactIdx >= 0 ? t('pc.booking.editContact') : t('pc.booking.newContact') }}</h4>
          <div class="pc-form-grid">
            <label class="pc-form-item"><span>{{ t('pc.booking.name') }}</span><input v-model="contactForm.name" :placeholder="t('pc.booking.namePhInput')" /></label>
            <label class="pc-form-item"><span>{{ t('pc.booking.emailLabel') }}</span><input v-model="contactForm.email" type="email" :placeholder="t('pc.booking.emailInput')" /></label>
            <label class="pc-form-item"><span>{{ t('pc.booking.phone') }}</span><input v-model="contactForm.phone" type="tel" :placeholder="t('pc.booking.phoneInput')" /></label>
          </div>
          <button type="button" class="btn-ghost primary" @click="saveContactForm">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createOrder, getProductDetail, getProductPackages, batchInventory } from '../api.js'
import { getDisplayCurrency } from '../api.js'
import { formatPrice } from '../utils/currency.js'
import { useLocale } from '../composables/useLocale.js'

const route = useRoute()
const router = useRouter()
const { t, tm } = useLocale()

/* ── URL 仅传 ID，产品信息通过 API 获取（与 travel-app Booking 一致） ── */
const productId = parseInt(route.query.productId) || 0
const packageId = parseInt(route.query.packageId) || 0
const date = route.query.date || ''
const inventoryId = parseInt(route.query.inventoryId) || 0
const qty = ref(parseInt(route.query.quantity) || 1)

/* ── API 加载的产品信息 ── */
const productTitle = ref('')
const currency = ref('AED')
const unitPrice = ref(0)
const maxQty = ref(8)
const packageName = ref('')
const loading = ref(true)
const loadError = ref('')

/** 创建空白游客对象 */
function emptyTraveler() {
  return { name: '', idType: 'passport', idNumber: '', phone: '', nameLang: 'zh' }
}

/* ── 退订政策（与 travel-app 相同的固定分档规则，文案走 i18n） ── */
const cancelPolicyDetail = computed(() => {
  const lines = tm('pc.booking.cancelPolicyDetail')
  return Array.isArray(lines) ? lines : []
})
const showCancelPolicy = ref(false)

const STORAGE_KEY = `booking_form_${productId || 'default'}`

/** 通过 API 加载产品与套餐信息，并用批量库存接口确认当日价格与可订上限 */
async function loadProductData() {
  if (!productId || !packageId) {
    loading.value = false
    loadError.value = t('pc.booking.missingParams')
    return
  }
  try {
    const [product, pkgItems] = await Promise.all([
      getProductDetail(productId),
      getProductPackages(productId).catch(() => []),
    ])
    productTitle.value = product.title || product.name || t('pc.booking.defaultProduct')
    currency.value = product.currency || 'AED'

    const pkg = (pkgItems || []).find((p) => Number(p.id) === packageId)
    if (pkg) packageName.value = pkg.name || pkg.title || ''

    if (date) {
      try {
        const items = await batchInventory({ packageId, startDate: date, endDate: date })
        // URL 传了 inventoryId 时精确匹配（多时段库存），否则取当日第一条
        const inv = inventoryId
          ? items.find((i) => Number(i.id) === inventoryId)
          : items[0]
        if (inv) {
          unitPrice.value = inv.unitPrice || product.minPrice || 0
          if (inv.currency) currency.value = inv.currency
          const left = (inv.capacity ?? 0) - (inv.reserved ?? 0)
          maxQty.value = left > 0 ? Math.min(left, 8) : 8
        } else {
          unitPrice.value = product.minPrice || 0
          console.warn(`未找到日期 ${date} 的库存记录`)
        }
      } catch (e) {
        console.error('获取库存价格失败', e)
        unitPrice.value = product.minPrice || 0
      }
    } else {
      unitPrice.value = product.minPrice || 0
    }
    // 数量钳制在可订上限内
    if (qty.value > maxQty.value) qty.value = maxQty.value
  } catch (e) {
    console.error('加载产品信息失败', e)
    loadError.value = t('pc.booking.loadProductFailed')
  } finally {
    loading.value = false
  }
}

/* ── 姓名语言 / 证件提示（走 i18n） ── */
function langLabel(lang) {
  return { zh: '中', en: '英', ar: 'ع' }[lang] || lang
}
function nameLangLabel(lang) {
  return t(`pc.booking.nameLangFull.${lang}`)
}
function namePlaceholder(lang) {
  return t(`pc.booking.namePh.${lang}`)
}
function idNumberPlaceholder(type) {
  return t(`pc.booking.idNumberPh.${type || 'other_id'}`)
}
function idTypeLabel(val) {
  return val ? t(`pc.booking.idTypes.${val}`) : ''
}

/* ── 游客列表：按 qty 初始化并联动 ── */
const travelers = ref(Array.from({ length: Math.max(1, qty.value) }, emptyTraveler))

watch(qty, (newQty) => {
  const cur = travelers.value.length
  if (newQty > cur) {
    for (let i = cur; i < newQty; i++) travelers.value.push(emptyTraveler())
  } else if (newQty < cur && newQty >= 1) {
    travelers.value.length = newQty
  }
})

const contact = ref({ name: '', email: '', phone: '' })
const remark = ref('')

/* ── sessionStorage 表单持久化：从支付页返回不丢数据 ── */
function restoreFormData() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return
    const data = JSON.parse(saved)
    if (data.qty != null) qty.value = data.qty
    if (data.travelers?.length) travelers.value = data.travelers
    if (data.contact) contact.value = { ...contact.value, ...data.contact }
    if (data.remark != null) remark.value = data.remark
  } catch (e) {
    console.warn('Failed to restore booking form:', e)
  }
}

function saveFormData() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      qty: qty.value,
      travelers: travelers.value,
      contact: contact.value,
      remark: remark.value,
    }))
  } catch (e) {
    console.warn('Failed to save booking form:', e)
  }
}

watch([qty, travelers, contact, remark], () => saveFormData(), { deep: true })

onMounted(() => {
  restoreFormData()
  loadProductData()
  loadSavedTravelers()
  loadSavedContacts()
})

/* ── 常用出行人 / 联系人（localStorage，键与 travel-app 一致） ── */
const SAVED_TRAVELERS_KEY = 'travel_saved_travelers'
const SAVED_CONTACTS_KEY = 'travel_saved_contacts'

const showTravelersModal = ref(false)
const showContactsModal = ref(false)
const savedTravelers = ref([])
const savedContacts = ref([])
const editingTravelerIdx = ref(-1)
const editingContactIdx = ref(-1)
const travelerForm = ref(emptyTraveler())
const contactForm = ref({ name: '', email: '', phone: '' })

function loadSavedTravelers() {
  try {
    const raw = localStorage.getItem(SAVED_TRAVELERS_KEY)
    savedTravelers.value = raw ? JSON.parse(raw) : []
  } catch { savedTravelers.value = [] }
}
function saveSavedTravelers() {
  localStorage.setItem(SAVED_TRAVELERS_KEY, JSON.stringify(savedTravelers.value))
}
function loadSavedContacts() {
  try {
    const raw = localStorage.getItem(SAVED_CONTACTS_KEY)
    savedContacts.value = raw ? JSON.parse(raw) : []
  } catch { savedContacts.value = [] }
}
function saveSavedContacts() {
  localStorage.setItem(SAVED_CONTACTS_KEY, JSON.stringify(savedContacts.value))
}

function openTravelersModal() {
  editingTravelerIdx.value = -1
  travelerForm.value = emptyTraveler()
  showTravelersModal.value = true
}
function openContactsModal() {
  editingContactIdx.value = -1
  contactForm.value = { name: '', email: '', phone: '' }
  showContactsModal.value = true
}

function selectSavedTraveler(st) {
  const duplicate = travelers.value.find((t) => t.name.trim() && t.name === st.name && t.idNumber === st.idNumber)
  if (duplicate) {
    error.value = t('pc.booking.duplicateTraveler', { name: st.name })
    return
  }
  if (travelers.value.length === 1 && !travelers.value[0].name) {
    Object.assign(travelers.value[0], { ...st })
  } else {
    travelers.value.push({ ...st })
    qty.value = travelers.value.length
  }
  showTravelersModal.value = false
}
function startEditSavedTraveler(st) {
  const idx = savedTravelers.value.findIndex((s) => s.id === st.id)
  if (idx >= 0) {
    editingTravelerIdx.value = idx
    travelerForm.value = { ...st }
  }
}
function deleteSavedTraveler(id) {
  savedTravelers.value = savedTravelers.value.filter((s) => s.id !== id)
  saveSavedTravelers()
}
function saveTravelerForm() {
  if (!travelerForm.value.name.trim()) { error.value = t('pc.booking.nameRequired'); return }
  if (editingTravelerIdx.value >= 0) {
    savedTravelers.value[editingTravelerIdx.value] = { ...travelerForm.value }
  } else {
    savedTravelers.value.push({ id: Date.now(), ...travelerForm.value })
  }
  saveSavedTravelers()
  editingTravelerIdx.value = -1
  travelerForm.value = emptyTraveler()
}

function selectSavedContact(sc) {
  contact.value = { name: sc.name, email: sc.email, phone: sc.phone }
  showContactsModal.value = false
}
function startEditSavedContact(sc) {
  const idx = savedContacts.value.findIndex((s) => s.id === sc.id)
  if (idx >= 0) {
    editingContactIdx.value = idx
    contactForm.value = { ...sc }
  }
}
function deleteSavedContact(id) {
  savedContacts.value = savedContacts.value.filter((s) => s.id !== id)
  saveSavedContacts()
}
function saveContactForm() {
  if (!contactForm.value.name.trim()) { error.value = t('pc.booking.contactNameRequired'); return }
  if (!contactForm.value.email.trim()) { error.value = t('pc.booking.contactEmailRequired'); return }
  if (editingContactIdx.value >= 0) {
    savedContacts.value[editingContactIdx.value] = { ...contactForm.value }
  } else {
    savedContacts.value.push({ id: Date.now(), ...contactForm.value })
  }
  saveSavedContacts()
  editingContactIdx.value = -1
  contactForm.value = { name: '', email: '', phone: '' }
}

/** 下单成功后自动把当前游客/联系人存入常用列表 */
function autoSaveTravelersAndContact() {
  for (const t of travelers.value) {
    if (!t.name.trim()) continue
    const exists = savedTravelers.value.some((s) => s.name === t.name && s.idNumber === t.idNumber)
    if (!exists) savedTravelers.value.push({ id: Date.now() + Math.random(), ...t })
  }
  saveSavedTravelers()
  if (contact.value.name.trim() && contact.value.email.trim()) {
    const exists = savedContacts.value.some((s) => s.email === contact.value.email)
    if (!exists) {
      savedContacts.value.push({
        id: Date.now() + Math.random(),
        name: contact.value.name,
        email: contact.value.email,
        phone: contact.value.phone,
      })
    }
    saveSavedContacts()
  }
}

/* ── 提交 ── */
const submitting = ref(false)
const error = ref('')

const totalAmount = computed(() => unitPrice.value * qty.value)

function priceText(amount) {
  return formatPrice(amount, { from: currency.value })
}

/** 每位游客都填了姓名，且联系人姓名+邮箱不为空（与 travel-app 校验一致） */
const canSubmit = computed(() => {
  if (productId <= 0 || packageId <= 0) return false
  if (contact.value.name.trim() === '' || contact.value.email.trim() === '') return false
  return travelers.value.every((t) => t.name.trim() !== '')
})

function goBackToProduct() {
  if (productId) {
    router.push({ name: 'ProductDetail', params: { id: productId } })
  } else {
    router.back()
  }
}

function decreaseQty() {
  if (qty.value > 1) qty.value--
}
function increaseQty() {
  if (qty.value < maxQty.value) qty.value++
}
function addTraveler() {
  travelers.value.push(emptyTraveler())
  qty.value = travelers.value.length
}
function removeTraveler(idx) {
  if (travelers.value.length > 1) {
    travelers.value.splice(idx, 1)
    qty.value = travelers.value.length
  }
}

function generateReservationKey() {
  return `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function submitOrder() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const resp = await createOrder({
      productId,
      packageId,
      date,
      timeSlot: '',
      quantity: qty.value,
      customerEmail: contact.value.email,
      customerName: contact.value.name,
      customerPhone: contact.value.phone,
      travelers: travelers.value.map((tr) => ({
        name: tr.name,
        idType: tr.idType,
        idNumber: tr.idNumber,
        phone: tr.phone,
      })),
      remark: remark.value,
      reservationKey: generateReservationKey(),
      // 用户当前展示的币种，后端据此锁定汇率
      displayCurrency: getDisplayCurrency(),
    })
    sessionStorage.removeItem(STORAGE_KEY)
    autoSaveTravelersAndContact()
    // 跳转支付页，优先透传后端锁定的展示金额/币种
    router.push({
      name: 'Payment',
      query: {
        orderNo: resp.orderNo,
        totalAmount: resp.totalAmount,
        currency: resp.currency,
        displayAmount: resp.displayAmount,
        displayCurrency: resp.displayCurrency,
      },
    })
  } catch (e) {
    error.value = e.message || t('pc.booking.orderFailed')
  } finally {
    submitting.value = false
  }
}
</script>
