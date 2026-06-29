<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900">

    <div class="mb-8">
      <img src="/images/jelly.png" alt="Loading" class="w-28 h-28 jellyfish-bounce" />
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

  0%,
  100% {
    transform: translateY(-5%);
  }

  50% {
    transform: translateY(5%);
  }
}

@keyframes blink {

  0%,
  95%,
  98%,
  100% {
    transform: scaleY(1);
    opacity: 1;
  }

  96%,
  97% {
    transform: scaleY(0.1);
    opacity: 0.4;
  }
}
</style>
