<template>
  <article class="product-card" @click="$emit('open', product)">
    <div class="product-card-cover">
      <img :src="cover" :alt="title" loading="lazy" />
      <button class="icon-button save-button" type="button" aria-label="收藏">♡</button>
    </div>
    <div class="product-card-body">
      <div class="meta-line">{{ destination }} · 可即时确认</div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <div class="rating-row">
        <strong>4.8</strong>
        <span>128 条评价</span>
      </div>
      <div class="price-row">
        <span>每人起</span>
        <strong>{{ currency }} {{ priceText }}</strong>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import {
  formatPrice,
  productCover,
  productCurrency,
  productDescription,
  productDestination,
  productPrice,
  productTitle,
} from '../utils/product.js'

const props = defineProps({
  product: { type: Object, required: true },
  fallbackImage: { type: String, default: '' },
})

defineEmits(['open'])

const title = computed(() => productTitle(props.product))
const destination = computed(() => productDestination(props.product))
const description = computed(() => productDescription(props.product))
const cover = computed(() => productCover(props.product, props.fallbackImage))
const currency = computed(() => productCurrency(props.product))
const priceText = computed(() => formatPrice(productPrice(props.product)))
</script>
