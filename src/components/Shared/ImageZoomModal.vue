<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'

defineProps<{
  imageUrl: string
  altText: string
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const scale = ref(1)
const position = reactive({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })

// Reset values on open
const resetZoom = () => {
  scale.value = 1
  position.x = 0
  position.y = 0
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const zoomFactor = 0.1
  if (e.deltaY < 0) {
    scale.value = Math.min(scale.value + zoomFactor, 4)
  } else {
    scale.value = Math.max(scale.value - zoomFactor, 1)
    if (scale.value === 1) {
      position.x = 0
      position.y = 0
    }
  }
}

const startDrag = (e: MouseEvent | TouchEvent) => {
  isDragging.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  dragStart.x = clientX - position.x
  dragStart.y = clientY - position.y
}

const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || scale.value === 1) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  position.x = clientX - dragStart.x
  position.y = clientY - dragStart.y
}

const stopDrag = () => {
  isDragging.value = false
}
</script>

<template>
  <Transition name="fade" @enter="resetZoom">
    <div v-if="isOpen" class="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 selection:bg-transparent" @click.self="emit('close')">

      <!-- Top Action Bar -->
      <div class="flex items-center justify-between w-full max-w-7xl mx-auto z-10 text-white">
        <p class="text-xs font-mono opacity-60">Scroll to Zoom • Drag to Move around</p>
        <button @click="emit('close')" class="w-10 h-10 rounded-full bg-stone-900/80 border border-stone-800 flex items-center justify-center hover:bg-brand-primary transition-colors">
          <svg class="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- Interactive Canvas Frame -->
      <div
        class="flex-1 w-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        @wheel="handleWheel"
        @mousemove="onDrag"
        @touchmove="onDrag"
        @mousedown="startDrag"
        @touchstart="startDrag"
        @mouseup="stopDrag"
        @touchend="stopDrag"
        @mouseleave="stopDrag"
      >
        <img
          :src="imageUrl"
          :alt="altText"
          class="max-w-full max-h-[75vh] object-contain select-none pointer-events-none transition-transform duration-75 will-change-transform rounded-xl shadow-2xl"
          :style="{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
          }"
        />
      </div>

      <!-- Dynamic Zoom Indicator Pill -->
      <div class="z-10 flex justify-center mb-4">
        <span class="bg-stone-900/80 border border-stone-800 text-white px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider">
          Zoom: {{ Math.round(scale * 100) }}%
        </span>
      </div>

    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
