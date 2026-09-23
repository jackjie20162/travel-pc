import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './style.css'
import { loadCurrencyData } from './utils/currencyLoader.js'

// 启动时拉取后端币种/汇率，失败回退内置静态汇率，不阻塞渲染
loadCurrencyData()

createApp(App).use(router).mount('#app')
