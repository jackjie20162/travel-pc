/**
 * 用户认证状态管理 composable（移植自 travel-app，去掉 i18n 依赖）
 * 提供登录状态、用户信息、登录/注册/登出操作，模块级单例跨组件共享。
 */
import { ref, computed } from 'vue'
import {
  getToken, setToken, clearToken,
  getStoredUser, setStoredUser,
  login as apiLogin,
  register as apiRegister,
  getProfile as apiGetProfile,
  getCaptcha as apiGetCaptcha,
  sendEmailCode as apiSendEmailCode,
} from '../api.js'

const currentUser = ref(getStoredUser())
const authToken = ref(getToken())

export function useUser() {
  const isLoggedIn = computed(() => !!authToken.value)
  const username = computed(() => currentUser.value?.username || '')
  const nickname = computed(() => currentUser.value?.nickname || username.value)
  const email = computed(() => currentUser.value?.email || '')

  function applyAuth(data) {
    if (!data.token) {
      throw new Error('登录响应缺少 token，请重试')
    }
    authToken.value = data.token
    currentUser.value = data.user
    setToken(data.token)
    setStoredUser(data.user)
    return data
  }

  async function login({ email, captchaId, captchaAnswer, emailCode }) {
    const resp = await apiLogin({ email, captchaId, captchaAnswer, emailCode })
    return applyAuth(resp.data || resp)
  }

  async function register({ username, password, email, mobile, nickname, captchaId, captchaAnswer, emailCode }) {
    const resp = await apiRegister({ username, password, email, mobile, nickname, captchaId, captchaAnswer, emailCode })
    return applyAuth(resp.data || resp)
  }

  async function fetchCaptcha() {
    return apiGetCaptcha()
  }

  async function sendEmailCode(payload) {
    return apiSendEmailCode(payload)
  }

  async function fetchProfile() {
    try {
      const resp = await apiGetProfile()
      const data = resp.data || resp
      currentUser.value = data
      setStoredUser(data)
      return data
    } catch (e) {
      // 仅在 401/403（token 失效）时登出，网络错误保留登录状态
      if (e.message && (e.message.includes('401') || e.message.includes('403'))) {
        logout()
      }
      throw e
    }
  }

  function logout() {
    authToken.value = ''
    currentUser.value = null
    clearToken()
  }

  return {
    currentUser,
    authToken,
    isLoggedIn,
    username,
    nickname,
    email,
    login,
    register,
    fetchProfile,
    fetchCaptcha,
    sendEmailCode,
    logout,
  }
}
