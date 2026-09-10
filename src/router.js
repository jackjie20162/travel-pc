import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import DestinationView from './views/DestinationView.vue'
import ProductDetailView from './views/ProductDetailView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/destinations/:slug?', name: 'Destination', component: DestinationView },
  { path: '/products/:id', name: 'ProductDetail', component: ProductDetailView },
  { path: '/orders', redirect: '/' },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
