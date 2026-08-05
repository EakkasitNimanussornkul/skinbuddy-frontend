<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from './components/Shared/BottomNav.vue'
import TopNav from './components/Shared/TopNav.vue'
import MobileTopBar from './components/Shared/MobileTopBar.vue'
import ToastProvider from './components/Shared/ToastProvider.vue'
import LoginPopup from './components/Auth/LoginPopup.vue'
import LogoutModal from './components/Auth/LogoutModal.vue'
import { useThemeStore } from './stores/themeStore'
import ScrollToTopButton from './components/Shared/ScrollToTopButton.vue'

const themeStore = useThemeStore()
const route = useRoute()

onMounted(() => {
  themeStore.initTheme()
})
</script>

<template>
  <div class="bg-white dark:bg-[#121217] min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
    <LoginPopup />
    <LogoutModal />

    <!-- Desktop Top Navigation (Hidden on Mobile) -->
    <TopNav v-if="route.path !== '/quiz' && route.path !== '/setup-profile'" />

    <!-- Mobile Header Top Bar (Hidden on Desktop) -->
    <MobileTopBar v-if="route.path !== '/quiz' && route.path !== '/setup-profile'" />

    <!-- Main View Canvas -->
    <RouterView />
      <ScrollToTopButton />
    <!-- Mobile Bottom Navigation (5-Tab Layout) -->
    <BottomNav v-if="route.path !== '/quiz' && route.path !== '/setup-profile'" />

    <ToastProvider />
  </div>
</template>
