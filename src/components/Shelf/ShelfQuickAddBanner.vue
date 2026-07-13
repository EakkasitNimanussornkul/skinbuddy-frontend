<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
defineProps<{
  itemCount: number
}>()

const emit = defineEmits(['open-add-modal'])
</script>

<template>
  <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-primary-light via-white to-brand-primary-accent dark:from-brand-surface-dark dark:via-brand-surface-dark dark:to-brand-bg-dark p-6 shadow-md transition-all hover:shadow-lg border border-brand-primary/20 dark:border-stone-700">

    <!-- Ambient Blur Shapes -->
    <div class="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-primary/10 dark:bg-white/5 blur-2xl" />
    <div class="pointer-events-none absolute -bottom-10 right-20 h-28 w-28 rounded-full bg-brand-primary/20 dark:bg-brand-primary/10 blur-xl" />

    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div class="max-w-xl">
        <div class="flex items-center gap-2 mb-2">

          <!-- Status Pill: Light mode uses cyan/black, Dark mode uses deep translucent slate/cyan -->
          <span class="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 dark:bg-black/30 border border-brand-primary/20 dark:border-brand-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-text dark:text-brand-primary-accent backdrop-blur-md">
            <svg class="h-3 w-3 animate-pulse text-brand-primary dark:text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            Active Safety Shield
          </span>
          <span v-if="itemCount > 0" class="text-xs font-bold text-brand-text-muted dark:text-stone-400">
            Monitoring {{ itemCount }} {{ itemCount === 1 ? 'Product' : 'Products' }}
          </span>
        </div>

        <h2 class="font-serif text-xl sm:text-2xl font-bold leading-tight text-brand-text dark:text-white">
          Add Products to Check Compatibility
        </h2>
        <p class="mt-1 text-xs sm:text-sm text-brand-text-muted dark:text-stone-300 leading-relaxed font-medium">
          Log your daily skincare items so AI Consulter can alert you to dangerous ingredient interactions and track expiration windows.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <!-- Primary Action: Solid Cyan in light mode (white text), Cyan in dark mode (dark text for contrast) -->
        <button
          @click="emit('open-add-modal')"
          class="flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-5 py-3.5 text-xs font-bold text-white dark:text-brand-text shadow-sm transition-all hover:bg-brand-primary-hover active:scale-95"
        >
          <svg class="h-4 w-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          <span>Quick Add Product</span>
        </button>

        <!-- Secondary Action: Glassy button shifting based on theme -->
        <button
          @click="router.push('/explore')"
          class="flex items-center justify-center gap-1.5 rounded-2xl border border-brand-primary/20 dark:border-white/10 bg-white/60 dark:bg-white/5 px-4 py-3.5 text-xs font-bold text-brand-text dark:text-white backdrop-blur-md transition-all hover:bg-white dark:hover:bg-white/10 active:scale-95"
        >
          <span>Browse Catalog</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  </div>
</template>
