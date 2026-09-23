// IM WebSocket 客户端封装：连接/心跳/自动重连 + 命令收发 + 消息归一化。
// 与网关协议（im-common WsMsg）对应：
//   上行 chat/ack/ping/sessions/history；下行 push/offline/sessions/history/pong/error。

export const CMD = {
  CHAT: 'chat',
  ACK: 'ack',
  PING: 'ping',
  PONG: 'pong',
  PUSH: 'push',
  OFFLINE: 'offline',
  SESSIONS: 'sessions',
  HISTORY: 'history',
}

// 归一化消息：push(WsMsg) 用 from/to/time；history(WsMsgItem) 用 from_user_id/to_user_id/create_time。
// im_uid 协议中为字符串（防 JS 精度丢失），统一归一为 string。
export function normalizeMessage(raw) {
  return {
    msgId: raw.msg_id || '',
    sessionId: raw.session_id || '',
    fromUid: String(raw.from || raw.from_user_id || ''),
    toUid: String(raw.to || raw.to_user_id || ''),
    content: raw.content || '',
    contentType: raw.content_type || 1,
    seq: raw.seq || 0,
    time: raw.time || raw.create_time || 0,
    fromType: raw.from_type || 0,
    fromBizUid: raw.from_biz_uid || 0,
  }
}

// ImClient：一个连接实例对应一个已鉴权用户。通过回调向组件派发事件。
export class ImClient {
  constructor(buildUrl, handlers = {}) {
    this.buildUrl = buildUrl
    this.handlers = handlers // { onStatus, onMessage, onSessions, onHistory, onOffline, onError }
    this.ws = null
    this.manualClose = false
    this.retry = 0
    this.pingTimer = null
    this.reconnectTimer = null
  }

  connect() {
    this.manualClose = false
    this._emitStatus('connecting')
    let ws
    try {
      ws = new WebSocket(this.buildUrl())
    } catch (e) {
      this._emitStatus('error')
      this._scheduleReconnect()
      return
    }
    this.ws = ws
    ws.onopen = () => {
      this.retry = 0
      this._emitStatus('online')
      this._startPing()
    }
    ws.onmessage = (ev) => this._onRaw(ev.data)
    ws.onerror = () => this._emitStatus('error')
    ws.onclose = () => {
      this._stopPing()
      this._emitStatus('offline')
      if (!this.manualClose) this._scheduleReconnect()
    }
  }

  close() {
    this.manualClose = true
    this._stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        /* ignore */
      }
      this.ws = null
    }
  }

  get connected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN
  }

  // 发送聊天：to 为对端 im_uid（字符串）；或用 toType+toBizUid 由网关懒注册解析。
  // contentType：1文本 2图片 3商品卡片，默认文本。
  sendChat({ to = '', toType = 0, toBizUid = 0, content = '', contentType = 1 }) {
    const payload = { cmd: CMD.CHAT, to_type: toType, to_biz_uid: toBizUid, content, content_type: contentType }
    if (to) payload.to = String(to)
    return this._send(payload)
  }

  loadSessions() {
    return this._send({ cmd: CMD.SESSIONS })
  }

  // beforeSeq=0 取最新一页；>0 向前翻页取更早消息。
  loadHistory(sessionId, beforeSeq = 0) {
    return this._send({ cmd: CMD.HISTORY, session_id: sessionId, seq: beforeSeq || 0 })
  }

  ack(msgId) {
    if (msgId) this._send({ cmd: CMD.ACK, msg_id: msgId })
  }

  _send(obj) {
    if (this.connected) {
      this.ws.send(JSON.stringify(obj))
      return true
    }
    return false
  }

  _startPing() {
    this._stopPing()
    this.pingTimer = setInterval(() => this._send({ cmd: CMD.PING }), 30000)
  }

  _stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  // 指数退避重连，最长 30s。
  _scheduleReconnect() {
    if (this.manualClose || this.reconnectTimer) return
    const delay = Math.min(30000, 1000 * Math.pow(2, this.retry++))
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  _onRaw(data) {
    let msg
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }
    const h = this.handlers
    switch (msg.cmd) {
      case CMD.PUSH:
        h.onMessage && h.onMessage(normalizeMessage(msg))
        break
      case CMD.OFFLINE:
        if (Array.isArray(msg.data)) {
          h.onOffline && h.onOffline(msg.data.map(normalizeMessage))
        }
        break
      case CMD.SESSIONS:
        h.onSessions && h.onSessions(Array.isArray(msg.data) ? msg.data : [])
        break
      case CMD.HISTORY: {
        const d = msg.data || {}
        const list = Array.isArray(d.list) ? d.list.map(normalizeMessage) : []
        h.onHistory && h.onHistory({ sessionId: msg.session_id, list, hasMore: !!d.has_more })
        break
      }
      case CMD.PONG:
        break
      case 'error':
        h.onError && h.onError(msg.content || '服务返回错误')
        break
      default:
        break
    }
  }

  _emitStatus(status) {
    this.handlers.onStatus && this.handlers.onStatus(status)
  }
}
