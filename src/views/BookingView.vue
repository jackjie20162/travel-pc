<template>
  <div class="page booking-page">
    <div class="container">
      <!-- 步骤条：与 travel-app 一致 选择 → 确认 → 支付 -->
      <div class="pc-stepper-nav">
        <span class="step done">1 选择</span>
        <i class="step-line"></i>
        <span class="step current">2 确认</span>
        <i class="step-line"></i>
        <span class="step">3 支付</span>
      </div>

      <div v-if="loading" class="state-panel">正在加载产品信息...</div>
      <div v-else-if="loadError" class="state-panel">
        <p>{{ loadError }}</p>
        <button class="text-link" type="button" @click="goBackToProduct">返回商品页</button>
      </div>
      <template v-else>
        <div class="booking-layout">
          <div class="booking-main">
            <!-- 产品标题 + 退订政策 -->
            <div class="booking-product-header">
              <h1>{{ productTitle }}</h1>
              <button v-if="cancelPolicy" type="button" class="cancel-policy-link" @click="showCancelPolicy = !showCancelPolicy">
                {{ cancelPolicy }} {{ showCancelPolicy ? '∧' : '>' }}
              </button>
            </div>
            <div v-if="showCancelPolicy" class="cancel-policy-detail">
              <p v-for="(line, i) in cancelPolicyDetail" :key="i">{{ line }}</p>
            </div>

            <!-- 游客信息 -->
            <section class="pc-card">
              <div class="pc-card-header">
                <h3>游客信息 <small>共 {{ travelers.length }} 位</small></h3>
                <div class="header-actions">
                  <button type="button" class="btn-ghost" @click="openTravelersModal">选择常用出行人</button>
                  <button type="button" class="btn-ghost" @click="addTraveler">+ 添加游客</button>
                </div>
              </div>

              <div v-for="(traveler, idx) in travelers" :key="idx" class="traveler-card">
                <div class="traveler-card-header">
                  <span class="traveler-index">游客 {{ idx + 1 }}</span>
                  <button v-if="travelers.length > 1" type="button" class="btn-remove-traveler" @click="removeTraveler(idx)">删除</button>
                </div>
                <div class="pc-form-grid">
                  <label class="pc-form-item">
                    <span>证件类型</span>
                    <select v-model="traveler.idType">
                      <option value="passport">护照</option>
                      <option value="id_card">身份证</option>
                      <option value="other_id">其他证件</option>
                    </select>
                  </label>
                  <label class="pc-form-item">
                    <span>姓名（{{ nameLangLabel(traveler.nameLang) }}）<em>*</em></span>
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
                    <span>证件号</span>
                    <input
                      v-model="traveler.idNumber"
                      :placeholder="idNumberPlaceholder(traveler.idType)"
                      :dir="traveler.nameLang === 'ar' ? 'rtl' : 'ltr'"
                    />
                  </label>
                  <label class="pc-form-item">
                    <span>手机号</span>
                    <input v-model="traveler.phone" type="tel" placeholder="选填，便于司机/向导联系" :dir="traveler.nameLang === 'ar' ? 'rtl' : 'ltr'" />
                  </label>
                </div>
              </div>
            </section>

            <!-- 联系人信息 -->
            <section class="pc-card">
              <div class="pc-card-header">
                <h3>联系人信息</h3>
                <button type="button" class="btn-ghost" @click="openContactsModal">选择常用联系人</button>
              </div>
              <div class="pc-form-grid">
                <label class="pc-form-item">
                  <span>联系人姓名 <em>*</em></span>
                  <input v-model="contact.name" placeholder="用于接收确认邮件" />
                </label>
                <label class="pc-form-item">
                  <span>联系邮箱 <em>*</em></span>
                  <input v-model="contact.email" type="email" placeholder="your@email.com" />
                </label>
                <label class="pc-form-item">
                  <span>联系电话</span>
                  <input v-model="contact.phone" type="tel" placeholder="+971 ..." />
                </label>
              </div>
            </section>

            <!-- 特殊需求 -->
            <section class="pc-card">
              <div class="pc-card-header"><h3>特殊需求</h3></div>
              <textarea v-model="remark" rows="3" placeholder="如儿童座椅、素食、酒店接送地址等（选填）"></textarea>
            </section>

            <!-- 预订须知 -->
            <section class="pc-card notice">
              <div class="pc-card-header"><h3>重要须知</h3></div>
              <ul>
                <li>请确保证件信息与出行人本人一致，登机/入场需核验。</li>
                <li>建议提前 10 分钟到达集合点，迟到可能视为放弃。</li>
                <li>支付成功后订单进入商户接单流程，接单完成生成电子凭证。</li>
                <li>取消/退款按退订政策收取损失费，详见页面顶部说明。</li>
              </ul>
            </section>
          </div>

          <!-- 右侧粘性订单摘要 -->
          <aside class="pc-card booking-summary">
            <h3>订单摘要</h3>
            <div class="summary-line"><span>{{ productTitle }}</span></div>
            <div v-if="packageName" class="summary-line muted"><span>套餐：{{ packageName }}</span></div>
            <div class="summary-line muted"><span>出行日期</span><span>{{ date }}</span></div>
            <div class="summary-line">
              <span>人数</span>
              <span class="qty-stepper">
                <button type="button" :disabled="qty <= 1" @click="decreaseQty">−</button>
                <b>{{ qty }}</b>
                <button type="button" :disabled="qty >= maxQty" @click="increaseQty">+</button>
              </span>
            </div>
            <p class="qty-hint">最多预订 {{ maxQty }} 份</p>
            <div class="summary-line price"><span>单价</span><span>{{ priceText(unitPrice) }}</span></div>
            <div class="summary-line total">
              <span>总价</span>
              <strong>{{ priceText(totalAmount) }}</strong>
            </div>
            <button class="wide-button" type="button" :disabled="submitting || !canSubmit" @click="submitOrder">
              {{ submitting ? '提交中...' : `确认下单 · ${priceText(totalAmount)}` }}
            </button>
            <p class="panel-note">下单后进入支付页，支持 PayPal / Stripe。</p>
          </aside>
        </div>

        <div v-if="error" class="pc-error-toast">{{ error }}</div>
      </template>
    </div>

    <!-- 常用出行人管理弹窗 -->
    <div v-if="showTravelersModal" class="pc-modal-overlay" @click.self="showTravelersModal = false">
      <div class="pc-modal">
        <div class="pc-modal-header">
          <h3>常用出行人</h3>
          <button type="button" class="modal-close" @click="showTravelersModal = false">✕</button>
        </div>
        <div v-if="savedTravelers.length === 0" class="modal-empty">暂无保存的出行人，可在下方添加</div>
        <div v-else class="saved-list">
          <div v-for="st in savedTravelers" :key="st.id" class="saved-item" @click="selectSavedTraveler(st)">
            <div class="saved-item-info">
              <span class="saved-item-name">{{ st.name }}</span>
              <span class="saved-item-detail">{{ idTypeLabel(st.idType) }} {{ st.idNumber }} · {{ st.phone }}</span>
            </div>
            <div class="saved-item-actions">
              <button type="button" class="btn-ghost" @click.stop="startEditSavedTraveler(st)">编辑</button>
              <button type="button" class="btn-ghost danger" @click.stop="deleteSavedTraveler(st.id)">删除</button>
            </div>
          </div>
        </div>
        <div class="modal-form">
          <h4>{{ editingTravelerIdx >= 0 ? '编辑出行人' : '新增出行人' }}</h4>
          <div class="pc-form-grid">
            <label class="pc-form-item"><span>姓名</span><input v-model="travelerForm.name" placeholder="请输入姓名" /></label>
            <label class="pc-form-item">
              <span>证件类型</span>
              <select v-model="travelerForm.idType">
                <option value="passport">护照</option>
                <option value="id_card">身份证</option>
                <option value="other_id">其他证件</option>
              </select>
            </label>
            <label class="pc-form-item"><span>证件号</span><input v-model="travelerForm.idNumber" placeholder="证件号码" /></label>
            <label class="pc-form-item"><span>手机号</span><input v-model="travelerForm.phone" type="tel" placeholder="+971 ..." /></label>
          </div>
          <button type="button" class="btn-ghost primary" @click="saveTravelerForm">保存</button>
        </div>
      </div>
    </div>

    <!-- 常用联系人管理弹窗 -->
    <div v-if="showContactsModal" class="pc-modal-overlay" @click.self="showContactsModal = false">
      <div class="pc-modal">
        <div class="pc-modal-header">
          <h3>常用联系人</h3>
          <button type="button" class="modal-close" @click="showContactsModal = false">✕</button>
        </div>
        <div v-if="savedContacts.length === 0" class="modal-empty">暂无保存的联系人，可在下方添加</div>
        <div v-else class="saved-list">
          <div v-for="sc in savedContacts" :key="sc.id" class="saved-item" @click="selectSavedContact(sc)">
            <div class="saved-item-info">
              <span class="saved-item-name">{{ sc.name }}</span>
              <span class="saved-item-detail">{{ sc.email }} · {{ sc.phone }}</span>
            </div>
            <div class="saved-item-actions">
              <button type="button" class="btn-ghost" @click.stop="startEditSavedContact(sc)">编辑</button>
              <button type="button" class="btn-ghost danger" @click.stop="deleteSavedContact(sc.id)">删除</button>
            </div>
          </div>
        </div>
        <div class="modal-form">
          <h4>{{ editingContactIdx >= 0 ? '编辑联系人' : '新增联系人' }}</h4>
          <div class="pc-form-grid">
            <label class="pc-form-item"><span>姓名</span><input v-model="contactForm.name" placeholder="请输入姓名" /></label>
            <label class="pc-form-item"><span>邮箱</span><input v-model="contactForm.email" type="email" placeholder="your@email.com" /></label>
            <label class="pc-form-item"><span>手机号</span><input v-model="contactForm.phone" type="tel" placeholder="+971 ..." /></label>
          </div>
          <button type="button" class="btn-ghost primary" @click="saveContactForm">保存</button>
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

const route = useRoute()
const router = useRouter()

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

/* ── 退订政策（与 travel-app 相同的固定分档规则） ── */
const cancelPolicy = '订单确认成功后，取消需收取损失费70%起'
const cancelPolicyDetail = [
  '出行前7天以上取消，收取0%损失费',
  '出行前3-7天取消，收取30%损失费',
  '出行前1-3天取消，收取50%损失费',
  '出行当天取消，收取70%损失费',
  '出行后取消，收取100%损失费',
]
const showCancelPolicy = ref(false)

const STORAGE_KEY = `booking_form_${productId || 'default'}`

/** 通过 API 加载产品与套餐信息，并用批量库存接口确认当日价格与可订上限 */
async function loadProductData() {
  if (!productId || !packageId) {
    loading.value = false
    loadError.value = '缺少商品或套餐参数，请从商品详情页重新预订'
    return
  }
  try {
    const [product, pkgItems] = await Promise.all([
      getProductDetail(productId),
      getProductPackages(productId).catch(() => []),
    ])
    productTitle.value = product.title || product.name || '中东体验'
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
    loadError.value = '加载产品信息失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/* ── 姓名语言 / 证件提示 ── */
const NAME_LANG_LABELS = { zh: '中文', en: '英文', ar: '阿拉伯语' }
const NAME_PLACEHOLDERS = {
  zh: '请输入中文姓名，与证件一致',
  en: 'Please enter name as shown on passport',
  ar: 'الرجاء إدخال الاسم كما في الجواز',
}
const ID_NUMBER_PLACEHOLDERS = {
  passport: '请输入护照号，如 E12345678',
  id_card: '请输入 18 位身份证号',
  other_id: '请输入证件号码',
}
function langLabel(lang) {
  return { zh: '中', en: '英', ar: 'ع' }[lang] || lang
}
function nameLangLabel(lang) {
  return NAME_LANG_LABELS[lang] || '中文'
}
function namePlaceholder(lang) {
  return NAME_PLACEHOLDERS[lang] || NAME_PLACEHOLDERS.zh
}
function idNumberPlaceholder(type) {
  return ID_NUMBER_PLACEHOLDERS[type || 'other_id'] || ''
}
const ID_TYPE_LABELS = { passport: '护照', id_card: '身份证', other_id: '其他' }
function idTypeLabel(val) {
  return ID_TYPE_LABELS[val] || val || ''
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
    error.value = `出行人「${st.name}」已在列表中`
    return
  }
  if (travelers.value.length === 1 && !travelers.value[0].name) {
    Object.assign(travelers.value[0], { ...st })
  } else {
    travelers.value.push({ ...st })
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
  if (!travelerForm.value.name.trim()) { error.value = '请输入出行人姓名'; return }
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
  if (!contactForm.value.name.trim()) { error.value = '请输入联系人姓名'; return }
  if (!contactForm.value.email.trim()) { error.value = '请输入联系人邮箱'; return }
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
}
function removeTraveler(idx) {
  if (travelers.value.length > 1) travelers.value.splice(idx, 1)
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
    error.value = e.message || '下单失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>
