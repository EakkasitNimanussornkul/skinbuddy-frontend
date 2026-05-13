<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { useThemeStore } from './stores/themeStore'
import ToastProvider from './components/ToastProvider.vue'
const themeStore = useThemeStore()
const route = useRoute()

onMounted(() => {
  themeStore.initTheme()
})
</script>

<template>
  <div class="bg-white dark:bg-[#121217] min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
    <RouterView />

    <BottomNav v-if="route.path !== '/quiz'" />
    <ToastProvider />
  </div>
</template>
