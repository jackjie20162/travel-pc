// IM 全局单例 store：连接生命周期、会话/消息状态、未读与订单通知徽标计数。
// 面板关闭时仍需在线接收推送（导航栏红点），故连接与状态提升到模块级，
// ImSupportDrawer.vue 仅做展示与交互。
import { reactive } from 'vue'
import { ImClient } from './imClient'
import {
  buildImWsUrl,
  getImIdentity,
  getSupportTarget,
  normalizeSession,
  CONTENT_TYPE,
  buildProductContent,
  buildOrderContent,
} from './api'

export const imState = reactive({
  status: 'idle', // idle | connecting | online | offline | error
  sessions: [],
  activeSessionId: '',
  messages: [], // 当前会话消息（升序）
  hasMore: false,
  loadingHistory: false,
  uploading: false,
  unreadTotal: 0, // 面板未打开时收到的消息数（导航红点）
  orderAlert: 0, // 未读订单通知（contentType=4 且来自商户）
  drawerOpen: false,
  consult: null, // { product?, order? } 待自动发送的咨询卡片上下文
  toast: '',
})

let client = null
let pendingLoadMore = false
let consultSent = false

export function imConnected() {
  return imState.status === 'online'
}

export function imConnect() {
  if (client && (imState.status === 'online' || imState.status === 'connecting')) return
  const { bizUid } = getImIdentity()
  if (!bizUid) {
    imState.status = 'error'
    return
  }
  client = new ImClient(buildImWsUrl, handlers())
  client.connect()
}

export function imDisconnect() {
  if (client) {
    client.close()
    client = null
  }
  imState.status = 'idle'
  imState.sessions = []
  imState.activeSessionId = ''
  imState.messages = []
  imState.unreadTotal = 0
  imState.orderAlert = 0
  imState.drawerOpen = false
  imState.consult = null
  consultSent = false
}

// 打开客服面板；可携带咨询上下文（商品对象 / 订单对象），连接就绪后自动发送对应卡片
export function imOpenSupport(ctx = {}) {
  if (ctx.product) {
    imState.consult = { product: ctx.product }
    consultSent = false
  } else if (ctx.order) {
    imState.consult = { order: ctx.order }
    consultSent = false
  } else {
    imState.consult = null
  }
  imState.drawerOpen = true
  imConnect()
  // 已连接且会话已存在时 onSessions 不会再触发，直接补发一次
  trySendConsult()
}

export function imCloseSupport() {
  imState.drawerOpen = false
  imState.consult = null
  imState.unreadTotal = 0
  imState.orderAlert = 0
}

// 咨询卡片：连接就绪 + 会话就绪后只发一次
function trySendConsult() {
  if (!imState.consult || consultSent || !imState.activeSessionId || !imConnected()) return
  consultSent = true
  if (imState.consult.product) sendContent(buildProductContent(imState.consult.product), CONTENT_TYPE.PRODUCT)
  else if (imState.consult.order) sendContent(buildOrderContent(imState.consult.order), CONTENT_TYPE.ORDER)
}

function handlers() {
  return {
    onStatus: (s) => {
      imState.status = s
      if (s === 'online' && client) client.loadSessions()
    },
    onSessions: (list) => {
      imState.sessions = (list || []).map(normalizeSession)
      if (!imState.activeSessionId && imState.sessions.length) {
        // 客户视角优先商户客服会话（peer_type=2）
        const merchant = imState.sessions.find((x) => x.peerType === 2)
        selectSession(merchant || imState.sessions[0])
      }
      // 咨询上下文：会话就绪后自动发送一次商品/订单卡片
      trySendConsult()
    },
    onHistory: ({ sessionId, list, hasMore: more }) => {
      if (sessionId !== imState.activeSessionId) return
      if (pendingLoadMore) {
        imState.messages = dedupMerge(list, imState.messages)
      } else {
        imState.messages = dedupMerge(imState.messages, list)
      }
      imState.hasMore = more
      imState.loadingHistory = false
    },
    onMessage: (m) => {
      ingest(m)
    },
    onOffline: (list) => {
      list.forEach(ingest)
    },
    onError: (msg) => showToast(msg),
  }
}

// 收到消息：绑定/归属会话，面板未打开时累计未读与订单通知
function ingest(m) {
  if (m.sessionId === imState.activeSessionId || !imState.activeSessionId) {
    if (!imState.activeSessionId && m.sessionId) {
      imState.activeSessionId = m.sessionId
      bindPeerFromMsg(m)
    }
    imState.messages = dedupMerge(imState.messages, [m])
  }
  if (client) client.ack(m.msgId)
  // 对端消息判定（与 app isOutgoing 一致）：fromUid 等于会话对端 im_uid 即对方发来；
  // 本端乐观消息无 msgId 不会走 ingest，多端同步的自己消息 fromUid 不等于对端也不会误计
  const peer = imState.sessions.find((s) => s.sessionId === m.sessionId)
  const fromPeer = peer && peer.peerImUid ? m.fromUid === peer.peerImUid : true
  if (!imState.drawerOpen && fromPeer) {
    imState.unreadTotal++
    if (m.contentType === CONTENT_TYPE.ORDER) imState.orderAlert++
  }
}

function bindPeerFromMsg(m) {
  const exists = imState.sessions.find((s) => s.sessionId === m.sessionId)
  if (exists) return
  imState.sessions.unshift({
    sessionId: m.sessionId,
    peerImUid: m.fromUid,
    peerType: m.fromType || 2,
    peerBizUid: m.fromBizUid || 0,
    lastContent: m.content,
    lastSeq: m.seq,
    lastTime: m.time,
    unread: 0,
    lastContentType: m.contentType || CONTENT_TYPE.TEXT,
  })
}

export function selectSession(s) {
  if (!s || s.sessionId === imState.activeSessionId) return
  imState.activeSessionId = s.sessionId
  imState.messages = []
  imState.hasMore = false
  loadHistory(s.sessionId, 0)
}

function loadHistory(sessionId, beforeSeq) {
  if (!client || !imConnected()) return
  pendingLoadMore = beforeSeq > 0
  imState.loadingHistory = true
  client.loadHistory(sessionId, beforeSeq)
}

export function imLoadMore() {
  if (!imState.activeSessionId || !imState.messages.length) return
  loadHistory(imState.activeSessionId, imState.messages[0].seq)
}

function activePeer() {
  return imState.sessions.find((s) => s.sessionId === imState.activeSessionId) || null
}

// 统一发送：寻址（已绑定会话用 im_uid，未绑定用商户业务身份）+ 乐观追加
export function sendContent(content, contentType) {
  if (!client || !imConnected() || !content) return false
  const peer = activePeer()
  if (peer && peer.peerImUid) {
    client.sendChat({ to: peer.peerImUid, content, contentType })
  } else {
    const { toType, toBizUid } = getSupportTarget()
    client.sendChat({ toType, toBizUid, content, contentType })
  }
  let max = 0
  for (const m of imState.messages) if (m.seq > max) max = m.seq
  imState.messages = dedupMerge(imState.messages, [
    {
      msgId: '',
      sessionId: imState.activeSessionId,
      fromUid: '',
      toUid: peer?.peerImUid || '',
      content,
      contentType,
      seq: max + 1,
      time: Date.now(),
    },
  ])
  return true
}

export function imSendText(text) {
  const t = (text || '').trim()
  if (!t) return false
  return sendContent(t, CONTENT_TYPE.TEXT)
}

export function imSendImage(url) {
  return sendContent(url, CONTENT_TYPE.IMAGE)
}

export function imSetUploading(v) {
  imState.uploading = v
}

export function showToast(msg) {
  imState.toast = msg
  setTimeout(() => {
    if (imState.toast === msg) imState.toast = ''
  }, 2500)
}

// 合并去重并按 seq/time 升序（与 app 一致）
function dedupMerge(a, b) {
  const seen = new Set()
  const out = []
  for (const m of [...(a || []), ...(b || [])]) {
    const key = m.msgId || `${m.seq}_${m.time}_${m.content}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(m)
  }
  out.sort((x, y) => x.seq - y.seq || x.time - y.time)
  return out
}
