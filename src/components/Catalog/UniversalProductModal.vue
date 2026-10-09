<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ProductSpecContent from './ProductSpecContent.vue'
import EmptyState from '../Shared/EmptyState.vue'
import { needsProductDetail, prefetchProductBySlug } from '../../api/products'

const props = defineProps<{
  product: any
  mode?: 'explore' | 'shelf'
}>()

const emit = defineEmits(['close', 'refresh', 'open-compare-selector'])

// A product from the lean list has no ingredient tree, so the full one is fetched
// by slug (the card started the same request when the pointer reached it, and
// this reuses it). One that already has its tree opens as it is.
const detail = ref<Record<string, unknown> | null>(null)
const state = ref<'ready' | 'loading' | 'failed'>('ready')

const load = async () => {
  detail.value = null
  if (!needsProductDetail(props.product)) {
    state.value = 'ready'
    return
  }
  const slug = props.product.slug
  state.value = 'loading'
  try {
    const full = await prefetchProductBySlug(slug)
    if (props.product?.slug !== slug) return
    detail.value = full
    state.value = 'ready'
  } catch {
    if (props.product?.slug === slug) state.value = 'failed'
  }
}
watch(() => props.product, load, { immediate: true })

// The card's own fields stay underneath, so nothing it showed goes missing.
const shown = computed(() => (detail.value ? { ...props.product, ...detail.value } : props.product))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in" @click.self="emit('close')">

    <div class="w-full max-w-5xl max-h-[92vh] flex flex-col bg-brand-bg-light dark:bg-brand-bg-dark rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-stone-200 dark:border-stone-800">

      <div class="px-6 py-4 bg-brand-surface-light dark:bg-brand-surface-dark border-b border-stone-100 dark:border-stone-800 z-20 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            Quick Inspect
          </span>
          <router-link
            v-if="product?.slug"
            :to="`/product/${product.slug}`"
            @click="emit('close')"
            class="text-xs font-semibold text-stone-500 hover:text-brand-primary dark:text-stone-400 dark:hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer"
          >
            <span>View Full Page</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </router-link>
        </div>

        <button @click="emit('close')" class="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-brand-text dark:hover:text-white transition-colors cursor-pointer">
          <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="overflow-y-auto flex-1 hide-scrollbar bg-brand-bg-light dark:bg-brand-bg-dark">
        <div class="p-4 sm:p-6" :aria-busy="state === 'loading'">
          <!-- The shape of the content, so the modal does not jump when it lands. -->
          <div v-if="state === 'loading'" class="quick-inspect-loading space-y-6 animate-pulse motion-reduce:animate-none" role="status" aria-live="polite">
            <span class="sr-only">Loading product details</span>
            <div class="flex flex-col sm:flex-row gap-6">
              <div class="w-full sm:w-64 aspect-square rounded-3xl bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800"></div>
              <div class="flex-1 space-y-3 pt-2">
                <div class="h-3 w-1/4 rounded-full bg-brand-surface-border/60 dark:bg-stone-800"></div>
                <div class="h-6 w-3/4 rounded-full bg-brand-surface-border/60 dark:bg-stone-800"></div>
                <div class="h-3 w-1/2 rounded-full bg-brand-surface-border/60 dark:bg-stone-800"></div>
                <div class="h-12 w-full rounded-2xl bg-brand-surface-border/60 dark:bg-stone-800 mt-6"></div>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="n in 4" :key="n" class="h-14 rounded-2xl bg-brand-surface-light dark:bg-brand-surface-dark border border-brand-surface-border dark:border-stone-800"></div>
            </div>
          </div>

          <!-- Not a blank modal: the request never completed, so say that and offer
               another go. -->
          <EmptyState
            v-else-if="state === 'failed'"
            title="Couldn't Load This Product"
            message="We couldn't reach the catalog, so we can't show this product's ingredients right now. This is a connection problem, not a missing product."
            action-label="Try Again"
            @action="load"
          />

          <ProductSpecContent
            v-else
            :product="shown"
            :mode="mode || 'explore'"
            @open-compare-selector="emit('open-compare-selector', $event); emit('close')"
            @shelf-updated="emit('refresh')"
            @close="emit('close')"
          />
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
