<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from './components/Shared/BottomNav.vue'
import TopNav from './components/Shared/TopNav.vue'
import AppSidebar from './components/Shared/AppSidebar.vue'
import MobileTopBar from './components/Shared/MobileTopBar.vue'
import ToastProvider from './components/Shared/ToastProvider.vue'
import LoginPopup from './components/Auth/LoginPopup.vue'
import LogoutModal from './components/Auth/LogoutModal.vue'
import { useThemeStore } from './stores/themeStore'
import ScrollToTopButton from './components/Shared/ScrollToTopButton.vue'

const themeStore = useThemeStore()
const route = useRoute()

// Full-screen flows draw their own way out, so the site navigation is hidden:
// these paths, and any route with meta.fullScreen (the submit flow and the
// product edit page; a route's meta also covers a trailing slash).
const FULL_SCREEN_PATHS = ['/quiz', '/setup-profile']
const showChrome = computed(() => !FULL_SCREEN_PATHS.includes(route.path) && !route.meta.fullScreen)

onMounted(() => {
  themeStore.initTheme()
})
</script>

<template>
  <!-- Brand background and text, the same tokens body already uses
       (assets/style.css). This root painted pure white and a bluish #121217
       over them, so the one view that does not draw its own background -
       SkinTypeLanding - sat on a different white and black from every other
       page. -->
  <div class="bg-brand-bg-light dark:bg-brand-bg-dark min-h-screen text-brand-text dark:text-white transition-colors duration-300">
    <LoginPopup />
    <LogoutModal />

    <!-- On lg and up, the sidebar and the content column side by side; the
         column holds the slim search bar and the page. min-w-0 lets a wide
         page shrink beside the sidebar instead of pushing past the window.
         Below lg the sidebar and TopNav are hidden, and the column is the
         page as before, under MobileTopBar and over BottomNav. -->
    <div class="lg:flex">
      <AppSidebar v-if="showChrome" />

      <div class="app-content flex-1 min-w-0">
        <!-- Desktop search bar (hidden below lg) -->
        <TopNav v-if="showChrome" />

        <!-- Mobile Header Top Bar (Hidden on Desktop) -->
        <MobileTopBar v-if="showChrome" />

        <!-- Main View Canvas -->
        <RouterView />
      </div>
    </div>
    <ScrollToTopButton />
    <!-- Mobile Bottom Navigation (5-Tab Layout) -->
    <BottomNav v-if="showChrome" />

    <ToastProvider />
  </div>
</template>
