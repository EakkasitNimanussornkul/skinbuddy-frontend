<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from './components/Shared/BottomNav.vue'
import ToastProvider from './components/Shared/ToastProvider.vue'
import { useThemeStore } from './stores/themeStore'
import LoginPopup from './components/Auth/LoginPopup.vue'

const themeStore = useThemeStore()
const route = useRoute()



onMounted(() => {
  themeStore.initTheme()
})
</script>

<template>
  <div class="bg-white dark:bg-[#121217] min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
    <LoginPopup />

    <RouterView />

    <BottomNav v-if="route.path !== '/quiz' && route.path !== '/setup-profile'" />
    <ToastProvider />
  </div>
</template>
