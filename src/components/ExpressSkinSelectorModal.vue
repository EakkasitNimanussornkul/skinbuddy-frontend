<script setup lang="ts">
import { ref, computed } from 'vue'
import { skinProfiles } from '../data/skinprofiles' // Using your existing data file!
import SkinProfileCard from './SkinProfileCard.vue'

const props = defineProps<{
  isOpen: boolean
  isSaving: boolean
}>()

const emit = defineEmits(['close', 'confirm'])

const baumannTypes = Object.keys(skinProfiles)
const searchQuery = ref('')
const selectedType = ref('')
const isDropdownOpen = ref(false)

const filteredTypes = computed(() => {
  const query = searchQuery.value.toUpperCase().trim()
  if (!query) return baumannTypes
  return baumannTypes.filter(type =>
    type.includes(query) ||
    skinProfiles[type].subtitle.toUpperCase().includes(query)
  )
})

const selectedProfile = computed(() => {
  return selectedType.value ? skinProfiles[selectedType.value] : null
})

const selectType = (type: string) => {
  selectedType.value = type
  searchQuery.value = type
  isDropdownOpen.value = false
}

const closeDropdownDelay = () => {
  setTimeout(() => { isDropdownOpen.value = false }, 200)
}

const handleConfirm = () => {
  if (selectedType.value) {
    emit('confirm', selectedType.value)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
  v-if="isOpen"
  class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-stone-900/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
  @click.self="emit('close')"
>
      <div class="bg-white dark:bg-[#1C1917] w-full sm:max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] animate-slide-up relative">

        <!-- Close Button -->
        <button @click="emit('close')" class="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 rounded-full transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h2 class="text-xl font-serif font-bold text-brand-text dark:text-white mb-1 mt-2">Select Your Type</h2>
        <p class="text-xs text-stone-500 dark:text-stone-400 mb-5">Type the 4-letter code or search by keyword.</p>

        <!-- Searchable Combobox -->
        <div class="relative z-20">
          <div class="relative">
            <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input
              v-model="searchQuery"
              @focus="isDropdownOpen = true"
              @blur="closeDropdownDelay"
              type="text"
              placeholder="Search (e.g., OSPW, Dry, Ager)..."
              class="w-full bg-stone-50 dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 text-brand-text dark:text-white pl-11 pr-4 py-4 rounded-2xl font-bold text-lg focus:ring-0 focus:border-brand-primary outline-none transition-colors uppercase"
            />
          </div>

          <!-- Dropdown List -->
          <ul v-if="isDropdownOpen && filteredTypes.length > 0" class="absolute left-0 right-0 mt-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto hide-scrollbar z-30">
            <li
              v-for="type in filteredTypes"
              :key="type"
              @click="selectType(type)"
              class="px-4 py-3 hover:bg-brand-primary/5 dark:hover:bg-brand-primary/20 cursor-pointer border-b border-stone-100 dark:border-stone-700 last:border-0 flex justify-between items-center transition-colors"
            >
              <span class="font-bold text-brand-text dark:text-white">{{ type }}</span>
              <span class="text-xs text-stone-500">{{ skinProfiles[type].subtitle }}</span>
            </li>
          </ul>
        </div>

        <!-- Dynamic Skin Profile Card -->
        <div class="flex-1 overflow-y-auto hide-scrollbar mt-4">
          <SkinProfileCard
            v-if="selectedProfile"
            :typeCode="selectedType"
            :profile="selectedProfile"
          />
          <div v-else class="h-32 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600">
            <svg class="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <p class="text-xs font-medium">Search or select a type to view details.</p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="pt-4 border-t border-stone-100 dark:border-stone-800 mt-auto">
          <button
            @click="handleConfirm"
            :disabled="!selectedType || isSaving"
            :class="(!selectedType || isSaving) ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed' : 'bg-brand-primary hover:bg-orange-800 text-white shadow-md active:scale-[0.98]'"
            class="w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <svg v-if="isSaving" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ isSaving ? 'Saving Profile...' : 'Confirm My Skin Type' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
</style>
