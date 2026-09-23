<template>
  <div v-if="s.drawerOpen" class="im-drawer-mask" @click.self="close">
    <aside class="im-drawer pc-card">
      <header class="im-head">
        <div class="im-head-title">
          在线客服
          <span class="im-conn" :class="s.status">{{ connText }}</span>
        </div>
        <button type="button" class="im-close" title="关闭" @click="close">×</button>
      </header>

      <!-- 多会话切换（客户一般只有商户客服一个会话） -->
      <div v-if="s.sessions.length > 1" class="im-sessions">
        <button
          v-for="sess in s.sessions"
          :key="sess.sessionId"
          type="button"
          class="im-session"
          :class="{ active: sess.sessionId === s.activeSessionId }"
          @click="imSelectSession(sess)"
        >
          {{ sess.peerType === 2 ? '商户客服' : '会话' }}
          <b v-if="sess.unread">{{ sess.unread }}</b>
        </button>
      </div>

      <!-- 咨询上下文条 -->
      <div v-if="consultProduct" class="im-consult" @click="goProduct(consultProduct)">
        <img v-if="consultProduct.cover" :src="resolveMediaUrl(consultProduct.cover)" alt="" />
        <div v-else class="im-consult-ph">🏙️</div>
        <div class="im-consult-info">
          <small>正在咨询商品</small>
          <span>{{ consultProduct.name || '商品' }}</span>
        </div>
      </div>
      <div v-else-if="consultOrder" class="im-consult im-consult-order">
        <div class="im-consult-ph">📋</div>
        <div class="im-consult-info">
          <small>正在咨询订单</small>
          <span>{{ consultOrder.orderNo }}</span>
        </div>
      </div>

      <div ref="scrollEl" class="im-body">
        <div v-if="s.hasMore" class="im-more">
          <button type="button" :disabled="s.loadingHistory" @click="imLoadMore()">
            {{ s.loadingHistory ? '加载中…' : '查看更早消息' }}
          </button>
        </div>

        <p v-if="!s.messages.length" class="im-empty">
          向 Global Dubai 客服发起咨询，输入您的问题即可开始。
        </p>

        <div
          v-for="(m, i) in s.messages"
          :key="m.msgId || `${m.seq}_${m.time}_${i}`"
          class="im-msg"
          :class="isOutgoing(m) ? 'out' : 'in'"
        >
          <div class="im-bubble" :class="{ plain: typeOf(m) !== CT.TEXT }">
            <img
              v-if="typeOf(m) === CT.IMAGE"
              :src="m.content"
              class="im-img"
              alt="图片"
              @click="preview = m.content"
            />
            <div v-else-if="typeOf(m) === CT.PRODUCT" class="im-card" @click="goProductMsg(m)">
              <img v-if="productOf(m).cover" :src="resolveMediaUrl(productOf(m).cover)" alt="" />
              <div v-else class="im-card-ph">🏙️</div>
              <div class="im-card-info">
                <strong>{{ productOf(m).name || '商品' }}</strong>
                <span v-if="productOf(m).price" class="im-card-price">{{ productOf(m).price }} 起</span>
                <small>点击查看商品 ›</small>
              </div>
            </div>
            <div v-else-if="typeOf(m) === CT.ORDER" class="im-card im-order" @click="goOrderMsg(m)">
              <div class="im-card-ph">📋</div>
              <div class="im-card-info">
                <strong>{{ orderOf(m).title || '订单' }}</strong>
                <small class="im-order-no">{{ orderOf(m).orderNo }}</small>
                <span class="im-order-meta">
                  <em v-if="orderOf(m).date">{{ orderOf(m).date }}</em>
                  <em v-if="orderOf(m).quantity">{{ orderOf(m).quantity }} 份</em>
                  <em v-if="orderOf(m).amount">{{ orderOf(m).amount }} {{ orderOf(m).currency }}</em>
                  <em v-if="orderOf(m).status" class="im-order-status">{{ statusText(orderOf(m).status) }}</em>
                </span>
                <small>点击查看订单 ›</small>
              </div>
            </div>
            <div v-else class="im-text">{{ m.content }}</div>
            <div class="im-time">{{ formatClock(m.time) }}</div>
          </div>
        </div>
      </div>

      <footer class="im-composer">
        <label class="im-img-btn" :class="{ disabled: s.uploading || !connected }" title="发送图片">
          <input
            type="file"
            accept="image/*"
            :disabled="s.uploading || !connected"
            style="display: none"
            @change="onPickImage"
          />
          <span>{{ s.uploading ? '⏳' : '🖼️' }}</span>
        </label>
        <textarea
          v-model="draft"
          rows="2"
          placeholder="输入消息，Enter 发送"
          @keydown.enter.exact.prevent="send"
        ></textarea>
        <button type="button" class="im-send" :disabled="!canSend" @click="send">发送</button>
      </footer>

      <div v-if="preview" class="im-preview" @click="preview = ''">
        <img :src="preview" alt="预览" />
      </div>
      <div v-if="s.toast" class="im-toast">{{ s.toast }}</div>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  imState as s,
  imCloseSupport,
  imLoadMore,
  imSendImage,
  imSendText,
  imSetUploading,
  selectSession as imSelectSession,
  showToast,
} from './imStore'
import {
  CONTENT_TYPE as CT,
  formatClock,
  parseOrderContent,
  parseProductContent,
  uploadImage,
} from './api'
import { statusText } from '../../utils/order.js'
import { resolveMediaUrl } from '../../utils/media.js'

const router = useRouter()
const draft = ref('')
const scrollEl = ref(null)
const preview = ref('')

const connected = computed(() => s.status === 'online')
const canSend = computed(() => connected.value && draft.value.trim().length > 0)
const statusTextMap = {
  idle: '未连接',
  connecting: '连接中…',
  online: '已连接',
  offline: '已断开',
  error: '连接异常',
}
const connText = computed(() => statusTextMap[s.status] || s.status)
const consultProduct = computed(() => (s.consult ? s.consult.product : null))
const consultOrder = computed(() => (s.consult ? s.consult.order : null))

function typeOf(m) {
  return m.contentType || CT.TEXT
}
function productOf(m) {
  return parseProductContent(m.content) || {}
}
function orderOf(m) {
  return parseOrderContent(m.content) || {}
}
// 对端 im_uid 之外即本人发出（含本地乐观消息 fromUid 空串）
function isOutgoing(m) {
  const peer = s.sessions.find((x) => x.sessionId === m.sessionId)
  if (!peer || !peer.peerImUid) return true
  return m.fromUid !== peer.peerImUid
}
function close() {
  imCloseSupport()
}
function send() {
  if (!imSendText(draft.value)) return
  draft.value = ''
}
async function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!connected.value) {
    showToast('未连接，无法发送图片')
    return
  }
  imSetUploading(true)
  try {
    imSendImage(await uploadImage(file))
  } catch (err) {
    showToast(err.message || '图片上传失败')
  } finally {
    imSetUploading(false)
  }
}
function goProduct(p) {
  if (p?.id || p?.productId) router.push({ name: 'ProductDetail', params: { id: p.id || p.productId } })
}
function goProductMsg(m) {
  const p = productOf(m)
  if (p.productId) router.push({ name: 'ProductDetail', params: { id: p.productId } })
}
function goOrderMsg(m) {
  const o = orderOf(m)
  if (o.orderNo) router.push({ name: 'OrderDetail', params: { orderNo: o.orderNo } })
}

async function scrollToBottom() {
  await nextTick()
  const el = scrollEl.value
  if (el) el.scrollTop = el.scrollHeight
}
watch(() => s.messages.length, scrollToBottom)
watch(() => s.drawerOpen, (open) => open && scrollToBottom())
</script>
