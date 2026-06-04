<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <!-- Swapped to stone-50 and stone-900 -->
  <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900">

    <div class="animate-bounce-slow mb-8">
      <!-- Swapped to orange-700 and orange-300 -->
      <svg viewBox="0 0 100 100" class="w-24 h-24 text-orange-700 dark:text-orange-300">
        <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.15" />
        <circle cx="35" cy="40" r="5" fill="currentColor" class="animate-blink" />
        <circle cx="65" cy="40" r="5" fill="currentColor" class="animate-blink" />
        <path d="M 32 58 Q 50 75 68 58" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="transparent" />
      </svg>
    </div>

    <!-- Swapped text colors -->
    <p class="text-orange-700 dark:text-orange-300 font-bold tracking-widest uppercase text-xs animate-pulse">
      {{ message || 'Loading...' }}
    </p>

  </div>
</template>

<style scoped>
/* Custom gentle bounce so it doesn't look too chaotic */
.animate-bounce-slow {
  animation: gentleBounce 2s infinite ease-in-out;
}

@keyframes gentleBounce {
  0%, 100% { transform: translateY(-5%); }
  50% { transform: translateY(5%); }
}

/* Cute blinking animation for the eyes */
.animate-blink {
  animation: blink 3s infinite;
}

@keyframes blink {
  0%, 96%, 98% { transform: scaleY(1); opacity: 1; }
  97% { transform: scaleY(0.1); opacity: 0.5; } /* The blink happens here */
}
</style>
