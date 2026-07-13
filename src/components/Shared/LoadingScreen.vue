<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-bg-light dark:bg-brand-bg-dark backdrop-blur-xl transition-colors duration-500">

    <!-- Ambient Lighting Effect -->
    <div class="absolute w-64 h-64 bg-brand-primary/10 dark:bg-brand-primary/5 rounded-full blur-[80px] animate-ambient-pulse pointer-events-none"></div>

    <div class="relative z-10 flex flex-col items-center">
      <!-- Mascot Container -->
      <div class="mb-8 relative">
        <img
          src="/images/jelly.png"
          alt="Loading SkinBuddy..."
          class="w-32 h-32 object-contain jellyfish-swim drop-shadow-xl"
        />

        <!-- Subtle shadow directly beneath the mascot -->
        <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-2 bg-stone-300 dark:bg-black/40 rounded-[100%] blur-sm jellyfish-shadow"></div>
      </div>

      <!-- Loading Text -->
      <div class="flex flex-col items-center gap-3">
        <!-- Minimal Spinner Ring -->
        <div class="w-6 h-6 border-2 border-stone-200 dark:border-stone-800 border-t-brand-primary dark:border-t-brand-primary rounded-full animate-spin"></div>

        <p class="text-brand-text-muted dark:text-stone-400 font-bold tracking-[0.2em] uppercase text-[10px] animate-pulse">
          {{ message || 'Loading Experience...' }}
        </p>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 1. Fluid Swimming Animation */
.jellyfish-swim {
  animation: swim 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center center;
}

@keyframes swim {
  0%, 100% {
    transform: translateY(-8px) scaleY(1.02);
  }
  50% {
    transform: translateY(8px) scaleY(0.98);
  }
}

/* 2. Coordinated Shadow Animation */
.jellyfish-shadow {
  animation: shadowPulse 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes shadowPulse {
  0%, 100% {
    transform: translateX(-50%) scale(0.8);
    opacity: 0.3;
  }
  50% {
    transform: translateX(-50%) scale(1.1);
    opacity: 0.6;
  }
}

/* 3. Ambient Background Pulse */
.animate-ambient-pulse {
  animation: ambientPulse 4s infinite alternate;
}

@keyframes ambientPulse {
  0% { transform: scale(0.9); opacity: 0.7; }
  100% { transform: scale(1.1); opacity: 1; }
}
</style>
