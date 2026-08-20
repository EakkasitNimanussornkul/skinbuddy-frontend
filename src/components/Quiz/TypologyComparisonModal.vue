<script setup lang="ts">
import { ref } from 'vue'
import ImageZoomModal from '@/components/Shared/ImageZoomModal.vue'
import type { TraitDetail } from '@/data/typologydata'

// Nullable, and typed rather than `any`, because SkinProfileView.openTypologyModal
// assigns `typologyDetails[axis.letter] ?? null` - a stored skin_type that is not
// one of the sixteen Baumann codes produces a lookup miss. Declaring these `any`
// is what let a guard be applied to nine reads and omitted from two: the compiler
// had no way to point at the gap. FE-DEF-08.
defineProps<{
  activeTrait: TraitDetail | null
  oppositeTrait: TraitDetail | null
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

// Zoom State
const isZoomOpen = ref(false)
const zoomImageUrl = ref('')
const zoomAltText = ref('')

const triggerZoom = (url: string, alt: string) => {
  zoomImageUrl.value = url
  zoomAltText.value = alt
  isZoomOpen.value = true
}
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm p-0 sm:p-4" @click.self="emit('close')">

      <div class="w-full sm:max-w-4xl bg-brand-surface-light dark:bg-brand-surface-dark rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up relative border border-brand-surface-border dark:border-stone-800">

        <!-- Header -->
        <div class="px-6 py-5 border-b border-brand-surface-border dark:border-stone-800 flex items-center justify-between bg-brand-bg-light/50 dark:bg-stone-900/50">
          <div>
            <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Typology Comparison</span>
            <h3 class="text-lg font-serif font-bold text-brand-text dark:text-white leading-tight">
              {{ activeTrait?.name }} vs. {{ oppositeTrait?.name }}
            </h3>
          </div>
          <button @click="emit('close')" class="w-8 h-8 rounded-full bg-brand-surface-border/50 dark:bg-stone-800 flex items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors">
            <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Scrollable Comparison Content -->
        <div class="overflow-y-auto p-6 lg:p-8 flex-1 hide-scrollbar">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">

            <!-- User's Trait -->
            <div class="flex flex-col gap-4 border-2 border-brand-primary/30 bg-brand-primary/5 dark:bg-brand-primary/10 p-5 rounded-3xl relative">
              <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-md">
                <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h4 class="text-sm font-bold text-brand-text-muted uppercase tracking-widest">Your Skin Type</h4>

              <!-- Clickable Image Trigger -->
              <!-- The zoom affordance is conditional on there being an image.
                   The tile is a sized container, not an <img>, so it stayed
                   clickable when the trait was missing and threw on
                   activeTrait.image - FE-DEF-08. -->
              <div
                @click="activeTrait?.image && triggerZoom(activeTrait.image, activeTrait.name)"
                :class="[
                  'w-full aspect-[4/3] bg-brand-bg-light dark:bg-stone-900 rounded-2xl border border-brand-primary/20 flex items-center justify-center overflow-hidden relative',
                  activeTrait?.image ? 'cursor-zoom-in group' : '',
                ]"
              >
                <div v-if="activeTrait?.image" class="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 text-white font-bold text-xs gap-1.5 backdrop-blur-xs">
                  <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  Inspect Macro Texture
                </div>
                <img v-if="activeTrait?.image" :src="activeTrait.image" :alt="activeTrait.name" class="w-full h-full object-cover" />
                <span v-else class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Reference image unavailable</span>
              </div>

              <div>
                <h3 class="text-2xl font-serif font-bold text-brand-text dark:text-white mb-2">{{ activeTrait?.name }} ({{ activeTrait?.letter }})</h3>
                <p class="text-sm text-brand-text-muted font-medium leading-relaxed">{{ activeTrait?.desc }}</p>
              </div>

              <ul class="space-y-2.5 mt-2">
                <li v-for="(point, idx) in activeTrait?.points" :key="idx" class="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-brand-text dark:text-stone-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 flex-shrink-0"></span>
                  {{ point }}
                </li>
              </ul>
            </div>

            <!-- Opposite Trait -->
            <div class="flex flex-col gap-4 border border-brand-surface-border dark:border-stone-800 bg-brand-surface-light dark:bg-stone-900/30 p-5 rounded-3xl">
              <h4 class="text-sm font-bold text-brand-text-muted uppercase tracking-widest">The Opposite</h4>

              <!-- Clickable Image Trigger -->
              <div
                @click="oppositeTrait?.image && triggerZoom(oppositeTrait.image, oppositeTrait.name)"
                :class="[
                  'w-full aspect-[4/3] bg-brand-bg-light dark:bg-stone-900 rounded-2xl border border-brand-surface-border dark:border-stone-800 flex items-center justify-center overflow-hidden relative',
                  oppositeTrait?.image ? 'cursor-zoom-in group' : '',
                ]"
              >
                <div v-if="oppositeTrait?.image" class="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 text-white font-bold text-xs gap-1.5 backdrop-blur-xs">
                  <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  Inspect Macro Texture
                </div>
                <img v-if="oppositeTrait?.image" :src="oppositeTrait.image" :alt="oppositeTrait.name" class="w-full h-full object-cover" />
                <span v-else class="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">Reference image unavailable</span>
              </div>

              <div>
                <h3 class="text-2xl font-serif font-bold text-brand-text dark:text-white mb-2">{{ oppositeTrait?.name }} ({{ oppositeTrait?.letter }})</h3>
                <p class="text-sm text-brand-text-muted font-medium leading-relaxed">{{ oppositeTrait?.desc }}</p>
              </div>

              <ul class="space-y-2.5 mt-2">
                <li v-for="(point, idx) in oppositeTrait?.points" :key="idx" class="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-brand-text dark:text-stone-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 flex-shrink-0"></span>
                  {{ point }}
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  </Transition>

  <!-- Nested Fullscreen Pan Zoom Canvas Overlay -->
  <Teleport to="body">
    <ImageZoomModal
      :is-open="isZoomOpen"
      :image-url="zoomImageUrl"
      :alt-text="zoomAltText"
      @close="isZoomOpen = false"
    />
  </Teleport>
</template>

<style scoped>
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
