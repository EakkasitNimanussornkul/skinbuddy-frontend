<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900">

    <div class="jellyfish-bounce mb-8">

      <svg viewBox="0 0 120 120" class="w-24 h-24 text-orange-700 dark:text-orange-300">
        <circle cx="60" cy="60" r="55" fill="currentColor" opacity="0.15" />

        <ellipse cx="60" cy="45" rx="40" ry="32" fill="currentColor" opacity="0.95" />

        <path d="M 35 68 L 30 106" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" fill="transparent" opacity="0.9" />
        <path d="M 45 74 L 42 110" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" fill="transparent" opacity="0.9" />
        <path d="M 55 76 L 55 112" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" fill="transparent" opacity="0.9" />
        <path d="M 65 76 L 65 112" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" fill="transparent" opacity="0.9" />
        <path d="M 75 74 L 78 110" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" fill="transparent" opacity="0.9" />
        <path d="M 85 68 L 90 106" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" fill="transparent" opacity="0.9" />

        <circle cx="45" cy="55" r="2" fill="currentColor" opacity="0.3" />
        <circle cx="55" cy="58" r="2" fill="currentColor" opacity="0.3" />
        <circle cx="65" cy="58" r="2" fill="currentColor" opacity="0.3" />
        <circle cx="75" cy="55" r="2" fill="currentColor" opacity="0.3" />
        <circle cx="42" cy="74" r="2.5" fill="currentColor" opacity="0.3" />
        <circle cx="78" cy="74" r="2.5" fill="currentColor" opacity="0.3" />

        <circle cx="48" cy="42" r="4" fill="#4c1d05" class="animate-blink" />
        <circle cx="72" cy="42" r="4" fill="#4c1d05" class="animate-blink" />
        <path d="M 54 51 Q 60 57 66 51" stroke="#4c1d05" stroke-width="3.5" stroke-linecap="round" fill="transparent" />
      </svg>
    </div>

    <p class="text-orange-700 dark:text-orange-300 font-bold tracking-widest uppercase text-xs animate-pulse">
      {{ message || 'Loading...' }}
    </p>

  </div>
</template>

<style scoped>
/* Custom gentle bounce so it doesn't look too chaotic */
.jellyfish-bounce {
  animation: gentleBounce 2s infinite ease-in-out;
}

@keyframes gentleBounce {
  0%, 100% { transform: translateY(-5%); }
  50% { transform: translateY(5%); }
}

/* Cute blinking animation for the eyes */
.animate-blink {
  animation: blink 3.5s infinite;
  transform-origin: center;
}

@keyframes blink {
  0%, 95%, 98%, 100% { transform: scaleY(1); opacity: 1; }
  96%, 97% { transform: scaleY(0.1); opacity: 0.4; }
}
</style>
