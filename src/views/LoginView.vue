<template>
  <div class="page login-page">
    <div class="container narrow">
      <section class="pc-card auth-card">
        <h1>{{ isRegister ? '创建账户' : '欢迎回来' }}</h1>
        <p class="muted">{{ isRegister ? '注册后即可预订中东体验并管理订单' : '使用邮箱验证码登录，无需密码' }}</p>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <template v-if="isRegister">
            <label class="modal-field">
              <span>用户名 <em>*</em></span>
              <input v-model="form.username" placeholder="登录名" required />
            </label>
            <label class="modal-field">
              <span>昵称</span>
              <input v-model="form.nickname" placeholder="选填" />
            </label>
            <label class="modal-field">
              <span>密码 <em>*</em></span>
              <input v-model="form.password" type="password" placeholder="6-20 位密码" required />
            </label>
          </template>

          <label class="modal-field">
            <span>邮箱 <em>*</em></span>
            <input v-model="form.email" type="email" placeholder="you@example.com" required />
          </label>

          <label v-if="isRegister" class="modal-field">
            <span>手机号</span>
            <input v-model="form.mobile" type="tel" placeholder="选填" />
          </label>

          <!-- 图形验证码：SVG 直接渲染，点击刷新 -->
          <label class="modal-field">
            <span>图形验证码 <em>*</em></span>
            <div class="captcha-row">
              <input v-model="form.captchaAnswer" placeholder="输入图中算式结果" required />
              <div class="captcha-img" title="点击刷新" @click="refreshCaptcha">
                <img v-if="captchaSrc" :src="captchaSrc" alt="captcha" />
                <span v-else>点击获取</span>
              </div>
            </div>
          </label>

          <!-- 邮件验证码 -->
          <label class="modal-field">
            <span>邮件验证码 <em>*</em></span>
            <div class="captcha-row">
              <input v-model="form.emailCode" placeholder="6 位验证码" required />
              <button
                type="button"
                class="btn-send-code"
                :disabled="codeCooldown > 0 || sendingCode"
                @click="handleSendCode"
              >
                {{ sendingCode ? '发送中...' : (codeCooldown > 0 ? `${codeCooldown}s` : '发送验证码') }}
              </button>
            </div>
          </label>

          <div v-if="error" class="pc-error-toast inline">{{ error }}</div>

          <button class="wide-button" type="submit" :disabled="loading">
            {{ loading ? '请稍候...' : (isRegister ? '注册并登录' : '登录') }}
          </button>
        </form>

        <div class="auth-switch">
          <span>{{ isRegister ? '已有账户？' : '还没有账户？' }}</span>
          <a href="#" @click.prevent="toggleMode">{{ isRegister ? '去登录' : '注册新账户' }}</a>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUser } from '../composables/user.js'

const route = useRoute()
const router = useRouter()
const user = useUser()

const isRegister = ref(route.query.mode === 'register')
const loading = ref(false)
const error = ref('')
const sendingCode = ref(false)
const codeCooldown = ref(0)
let cooldownTimer = null

const form = reactive({
  username: '',
  password: '',
  email: '',
  mobile: '',
  nickname: '',
  captchaId: '',
  captchaAnswer: '',
  emailCode: '',
})

const captchaSrc = ref('')

async function refreshCaptcha() {
  try {
    const data = await user.fetchCaptcha()
    form.captchaId = data.captchaId
    // 后端返回 SVG 字符串，用 TextEncoder 正确编码为 base64 data URI
    const bytes = new TextEncoder().encode(data.captchaImage)
    const base64 = btoa(String.fromCharCode(...bytes))
    captchaSrc.value = 'data:image/svg+xml;base64,' + base64
  } catch {
    captchaSrc.value = ''
  }
}

function toggleMode() {
  isRegister.value = !isRegister.value
  error.value = ''
  refreshCaptcha()
}

onMounted(refreshCaptcha)

async function handleSendCode() {
  error.value = ''
  if (!form.email) { error.value = '请先填写邮箱'; return }
  if (!form.captchaId || !form.captchaAnswer) { error.value = '请先完成图形验证码'; return }
  sendingCode.value = true
  try {
    await user.sendEmailCode({ email: form.email, captchaId: form.captchaId, captchaAnswer: form.captchaAnswer })
    startCooldown()
    refreshCaptcha()
    form.captchaAnswer = ''
  } catch (e) {
    error.value = e.message || '验证码发送失败'
    refreshCaptcha()
    form.captchaAnswer = ''
  } finally {
    sendingCode.value = false
  }
}

function startCooldown() {
  codeCooldown.value = 60
  cooldownTimer = setInterval(() => {
    codeCooldown.value--
    if (codeCooldown.value <= 0) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    if (isRegister.value) {
      await user.register({
        username: form.username,
        password: form.password,
        email: form.email,
        mobile: form.mobile,
        nickname: form.nickname,
        captchaId: form.captchaId,
        captchaAnswer: form.captchaAnswer,
        emailCode: form.emailCode,
      })
    } else {
      await user.login({
        email: form.email,
        captchaId: form.captchaId,
        captchaAnswer: form.captchaAnswer,
        emailCode: form.emailCode,
      })
    }
    router.replace(route.query.redirect || '/orders')
  } catch (e) {
    error.value = e.message || '操作失败，请重试'
    refreshCaptcha()
    form.captchaAnswer = ''
  } finally {
    loading.value = false
  }
}
</script>
