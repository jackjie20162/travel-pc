<template>
  <div class="page login-page">
    <div class="container narrow">
      <section class="pc-card auth-card">
        <h1>{{ isRegister ? t('pc.auth.createAccount') : t('pc.auth.welcomeBack') }}</h1>
        <p class="muted">{{ isRegister ? t('pc.auth.registerDesc') : t('pc.auth.loginDesc') }}</p>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <template v-if="isRegister">
            <label class="modal-field">
              <span>{{ t('pc.auth.username') }} <em>*</em></span>
              <input v-model="form.username" :placeholder="t('pc.auth.usernamePh')" required />
            </label>
            <label class="modal-field">
              <span>{{ t('pc.auth.nickname') }}</span>
              <input v-model="form.nickname" :placeholder="t('pc.auth.optional')" />
            </label>
            <label class="modal-field">
              <span>{{ t('pc.auth.password') }} <em>*</em></span>
              <input v-model="form.password" type="password" :placeholder="t('pc.auth.passwordPh')" required />
            </label>
          </template>

          <label class="modal-field">
            <span>{{ t('pc.auth.email') }} <em>*</em></span>
            <input v-model="form.email" type="email" placeholder="you@example.com" required />
          </label>

          <label v-if="isRegister" class="modal-field">
            <span>{{ t('pc.auth.mobile') }}</span>
            <input v-model="form.mobile" type="tel" :placeholder="t('pc.auth.optional')" />
          </label>

          <!-- 图形验证码：SVG 直接渲染，点击刷新 -->
          <label class="modal-field">
            <span>{{ t('pc.auth.captcha') }} <em>*</em></span>
            <div class="captcha-row">
              <input v-model="form.captchaAnswer" :placeholder="t('pc.auth.captchaPh')" required />
              <div class="captcha-img" :title="t('pc.auth.clickRefresh')" @click="refreshCaptcha">
                <img v-if="captchaSrc" :src="captchaSrc" alt="captcha" />
                <span v-else>{{ t('pc.auth.clickGet') }}</span>
              </div>
            </div>
          </label>

          <!-- 邮件验证码 -->
          <label class="modal-field">
            <span>{{ t('pc.auth.emailCode') }} <em>*</em></span>
            <div class="captcha-row">
              <input v-model="form.emailCode" :placeholder="t('pc.auth.emailCodePh')" required />
              <button
                type="button"
                class="btn-send-code"
                :disabled="codeCooldown > 0 || sendingCode"
                @click="handleSendCode"
              >
                {{ sendingCode ? t('pc.auth.sending') : (codeCooldown > 0 ? `${codeCooldown}s` : t('pc.auth.sendCode')) }}
              </button>
            </div>
          </label>

          <div v-if="error" class="pc-error-toast inline">{{ error }}</div>

          <button class="wide-button" type="submit" :disabled="loading">
            {{ loading ? t('pc.auth.pleaseWait') : (isRegister ? t('pc.auth.registerAndLogin') : t('pc.auth.login')) }}
          </button>
        </form>

        <div class="auth-switch">
          <span>{{ isRegister ? t('pc.auth.hasAccount') : t('pc.auth.noAccount') }}</span>
          <a href="#" @click.prevent="toggleMode">{{ isRegister ? t('pc.auth.goLogin') : t('pc.auth.registerNew') }}</a>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUser } from '../composables/user.js'
import { useLocale } from '../composables/useLocale.js'

const route = useRoute()
const router = useRouter()
const user = useUser()
const { t } = useLocale()

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
  if (!form.email) { error.value = t('pc.auth.emailRequired'); return }
  if (!form.captchaId || !form.captchaAnswer) { error.value = t('pc.auth.captchaRequired'); return }
  sendingCode.value = true
  try {
    await user.sendEmailCode({ email: form.email, captchaId: form.captchaId, captchaAnswer: form.captchaAnswer })
    startCooldown()
    refreshCaptcha()
    form.captchaAnswer = ''
  } catch (e) {
    error.value = e.message || t('pc.auth.sendCodeFailed')
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
    error.value = e.message || t('pc.auth.operationFailed')
    refreshCaptcha()
    form.captchaAnswer = ''
  } finally {
    loading.value = false
  }
}
</script>
