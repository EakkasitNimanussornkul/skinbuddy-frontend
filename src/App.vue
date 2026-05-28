<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import ToastProvider from './components/ToastProvider.vue'
import { useThemeStore } from './stores/themeStore'
// 1. Import the new popup component
import LoginPopup from './components/LoginPopup.vue'

const themeStore = useThemeStore()
const route = useRoute()

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="bg-white dark:bg-[#121217] min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
    <LoginPopup />

    <RouterView />

    <BottomNav v-if="route.path !== '/quiz'" />
    <ToastProvider />
  </div>
</template>
