import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { i18n } from './locales/index.js'
import './style.css'
import { loadCurrencyData } from './utils/currencyLoader.js'

// 启动时拉取后端币种/汇率，失败回退内置静态汇率，不阻塞渲染
loadCurrencyData()

createApp(App).use(router).use(i18n).mount('#app')
