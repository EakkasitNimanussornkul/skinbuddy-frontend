<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isVisible = ref(false)

const handleScroll = () => {
  // Show button when scrolled down more than 300px
  isVisible.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <Transition name="fade-slide">
    <button
      v-if="isVisible"
      @click="scrollToTop"
      class="fixed bottom-24 right-5 sm:bottom-8 sm:right-8 z-40 w-12 h-12 rounded-full bg-brand-surface-light/90 dark:bg-stone-900/90 text-brand-text dark:text-stone-100 border border-brand-surface-border dark:border-stone-800 shadow-xl backdrop-blur-md flex items-center justify-center hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary dark:hover:text-white hover:border-brand-primary transition-all duration-300 active:scale-90 cursor-pointer group"
      aria-label="Scroll to top"
    >
      <svg class="w-5 h-5 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  </Transition>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.9);
}
</style>
