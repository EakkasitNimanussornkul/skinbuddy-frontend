<script setup lang="ts">
/**
 * Generic confirmation dialog.
 *
 * Used for UC-15 SRS-62 ("prompt for confirmation before replacing an existing
 * active routine") but deliberately content-agnostic, so any flow that needs a
 * yes/no gate can reuse it rather than adding another one-off modal.
 */
withDefaults(
  defineProps<{
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'primary' | 'danger'
    busy?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'primary',
    busy: false,
  },
)

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-fade-in"
      @click.self="!busy && emit('cancel')"
    >
      <div
        class="bg-brand-surface-light dark:bg-brand-surface-dark w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up border"
        :class="variant === 'danger'
          ? 'border-semantic-error/30 dark:border-semantic-error/20'
          : 'border-brand-primary/25 dark:border-brand-primary/20'"
        role="dialog"
        aria-modal="true"
      >
        <!-- Header -->
        <div
          class="p-6 flex flex-col items-center text-center border-b"
          :class="variant === 'danger'
            ? 'bg-semantic-error/5 dark:bg-semantic-error/10 border-semantic-error/20'
            : 'bg-brand-primary-light/50 dark:bg-brand-primary/10 border-brand-primary/20'"
        >
          <div
            class="w-16 h-16 bg-brand-surface-light dark:bg-brand-bg-dark rounded-full flex items-center justify-center shadow-sm mb-4 border"
            :class="variant === 'danger'
              ? 'text-semantic-error border-semantic-error/30 dark:border-semantic-error/40'
              : 'text-brand-primary border-brand-primary/30 dark:border-brand-primary/40'"
          >
            <svg class="w-8 h-8 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-brand-text dark:text-white">{{ title }}</h2>
        </div>

        <!-- Body -->
        <div class="p-6 text-center">
          <p class="text-sm text-brand-text-muted dark:text-stone-400 leading-relaxed">{{ message }}</p>
          <slot />
        </div>

        <!-- Actions -->
        <div class="p-4 grid grid-cols-2 gap-3 bg-brand-bg-light dark:bg-brand-bg-dark border-t border-brand-surface-border dark:border-stone-800">
          <button
            @click="emit('cancel')"
            :disabled="busy"
            class="py-3 rounded-xl font-bold text-sm text-brand-text dark:text-stone-300 bg-brand-surface-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 hover:bg-brand-bg-light dark:hover:bg-stone-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {{ cancelLabel }}
          </button>
          <button
            @click="emit('confirm')"
            :disabled="busy"
            class="py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            :class="variant === 'danger'
              ? 'bg-semantic-error hover:brightness-110 shadow-semantic-error/20'
              : 'bg-brand-primary hover:bg-brand-primary-hover shadow-brand-primary/20'"
          >
            <span
              v-if="busy"
              class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
            ></span>
            {{ busy ? 'Working…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
