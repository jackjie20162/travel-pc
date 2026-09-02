<template><div class="shell"><header><strong>GLOBAL DUBAI</strong><nav><a href="#/">首页</a><a href="#/search">探索</a><a href="#/planner">AI Planner</a><a href="#/orders">我的订单</a></nav><span>EN / 中文</span></header><main><section class="hero"><div><small>DUBAI EXPERIENCES</small><h1>把迪拜，变成一段值得记住的旅程。</h1><p>真实商品、实时库存、真实价格，直接预订。</p><div class="search"><input v-model="keyword" placeholder="搜索沙漠冲沙、跳伞、哈利法塔……" @keyup.enter="search"/><button @click="search">搜索</button></div></div></section><section v-if="loading" class="loading">正在加载真实旅游商品…</section><section v-else class="products"><article v-for="p in products" :key="p.id"><div class="photo">{{ p.destination || 'Dubai' }}</div><div class="card"><small>{{ p.code }}</small><h3>{{ p.title }}</h3><p>{{ p.description || '精彩迪拜体验' }}</p><strong>{{ p.currency || 'AED' }} {{ p.min_price ?? '--' }}</strong></div></article><div v-if="!products.length" class="empty">暂无商品。请先在商户端发布旅游产品。</div></section></main><footer>© Global Dubai Travel · Powered by Travel API</footer></div></template>
<script setup>
import { onMounted, ref } from 'vue'
const keyword=ref(''),products=ref([]),loading=ref(false)
const base=(import.meta.env.VITE_TRAVEL_API_BASE_URL||'http://localhost:9200').replace(/\/$/,'')
async function load(){loading.value=true;try{const r=await fetch(`${base}/api/travel/products?keyword=${encodeURIComponent(keyword.value)}`);if(r.ok){const d=await r.json();products.value=d.items||d.data?.items||d.data||[]}}finally{loading.value=false}}
function search(){load()}
onMounted(load)
</script>
