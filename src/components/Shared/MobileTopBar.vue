<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useAdmin } from '../../composables/useAdmin'
import SearchAutocompleteInput from './SearchAutocompleteInput.vue'

const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => authStore.user?.name?.split(' ')[0] || 'User')

// Tapping the user section opens /profile
const handleProfileClick = () => {
  router.push('/profile')
}

// The cog opens a small account menu for a signed-in user: Submit a product,
// My submissions, Review submissions for an admin, and Settings. A guest still goes
// straight to /settings, which asks them to sign in, as before.
const { isAdmin, ensureRole } = useAdmin()
const isMenuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const menuButton = ref<HTMLButtonElement | null>(null)

const toggleMenu = () => {
  if (!authStore.isAuthenticated) {
    router.push('/settings')
    return
  }
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) ensureRole()
}

const closeMenu = async (returnFocus = false) => {
  isMenuOpen.value = false
  if (returnFocus) {
    await nextTick()
    menuButton.value?.focus()
  }
}

const onMenuKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isMenuOpen.value) {
    event.preventDefault()
    closeMenu(true)
  }
}

const onClickOutside = (event: MouseEvent) => {
  if (menuRoot.value && !menuRoot.value.contains(event.target as Node)) isMenuOpen.value = false
}

onMounted(() => window.addEventListener('click', onClickOutside))
onUnmounted(() => window.removeEventListener('click', onClickOutside))
</script>

<template>
  <header class="lg:hidden sticky top-0 inset-x-0 z-40 bg-brand-surface-light/95 dark:bg-brand-surface-dark/95 backdrop-blur-md border-b border-brand-surface-border dark:border-stone-800 transition-colors duration-300 px-3 py-2.5">
    <div class="flex items-center justify-between gap-2.5 w-full">

      <!-- Left Side: Avatar + Name + Skin Type Badge (Pushes to /profile) -->
      <button
        @click="handleProfileClick"
        class="flex items-center gap-2 text-left group shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        title="View Profile"
      >
        <div class="w-10 h-10 rounded-full overflow-hidden border border-brand-primary/30 bg-brand-bg-light dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-2xs">
          <img v-if="authStore.user?.picture" :src="authStore.user.picture" alt="Profile" class="w-full h-full object-cover" />
          <svg v-else class="w-4 h-4 text-brand-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <div class="flex flex-col justify-center min-w-0">
          <span class="text-xs font-serif font-bold text-brand-text dark:text-white truncate max-w-[70px] sm:max-w-[100px] leading-tight">
            {{ userName }}
          </span>
          <span class="inline-block text-[9px] font-bold font-mono uppercase tracking-wider text-brand-primary dark:text-brand-primary-accent bg-brand-primary/10 px-1.5 py-0.2 rounded border border-brand-primary/20 mt-0.5 w-max">
            {{ authStore.user?.skin_type || 'SET TYPE' }}
          </span>
        </div>
      </button>

      <!-- Center: Search Input in between -->
      <div class="flex-1 min-w-0">
        <SearchAutocompleteInput placeholder="Search..." />
      </div>

      <!-- Right Side: the account menu (Submit a product, My submissions,
           Review submissions for an admin, and Settings). -->
      <div ref="menuRoot" class="relative shrink-0" @keydown="onMenuKeydown">
        <button
          ref="menuButton"
          type="button"
          @click.stop="toggleMenu"
          class="w-11 h-11 rounded-full bg-brand-surface-light dark:bg-stone-800 border border-brand-surface-border dark:border-stone-700 flex items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors cursor-pointer shadow-2xs"
          aria-label="Account menu"
          :aria-expanded="authStore.isAuthenticated ? (isMenuOpen ? 'true' : 'false') : undefined"
          :aria-controls="isMenuOpen ? 'mobile-account-menu' : undefined"
        >
        <svg class="w-5 h-5 stroke-[1.8]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        </button>

        <!-- Drops from the cog, from its top right corner. -->
        <Transition name="menu-drop">
          <nav
            v-if="isMenuOpen"
            id="mobile-account-menu"
            aria-label="Account"
            class="absolute right-0 top-full mt-2 w-60 origin-top-right rounded-2xl border border-brand-surface-border dark:border-stone-700 bg-brand-surface-light dark:bg-brand-surface-dark shadow-xl p-1.5 z-50"
          >
            <!-- First, and tinted: the way in to sending a product. -->
            <RouterLink to="/submissions/new" class="mobile-submit-product min-h-11 px-3 flex items-center gap-3 rounded-xl text-sm font-extrabold bg-brand-primary-light dark:bg-brand-primary/15 text-brand-primary-strong-hover dark:text-brand-primary-accent hover:bg-brand-primary-light/70 dark:hover:bg-brand-primary/25" @click="closeMenu()">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Submit a product
            </RouterLink>
            <RouterLink to="/submissions" class="mobile-my-submissions min-h-11 px-3 flex items-center gap-3 rounded-xl text-sm font-bold text-brand-text dark:text-stone-200 hover:bg-brand-bg-light dark:hover:bg-stone-800" @click="closeMenu()">
              <svg class="w-5 h-5 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v12H5.2L4 17.2z" /><path d="M8 9h8M8 12h5" /></svg>
              My submissions
            </RouterLink>
            <RouterLink v-if="isAdmin" to="/admin/submissions" class="mobile-review-submissions min-h-11 px-3 flex items-center gap-3 rounded-xl text-sm font-bold text-brand-text dark:text-stone-200 hover:bg-brand-bg-light dark:hover:bg-stone-800" @click="closeMenu()">
              <svg class="w-5 h-5 text-brand-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
              Review submissions
              <span class="ml-auto text-[10px] font-extrabold tracking-wider text-brand-text-muted">ADMIN</span>
            </RouterLink>
            <RouterLink to="/settings" class="mobile-settings min-h-11 px-3 flex items-center gap-3 rounded-xl text-sm font-bold text-brand-text dark:text-stone-200 hover:bg-brand-bg-light dark:hover:bg-stone-800" @click="closeMenu()">
              <svg class="w-5 h-5 text-brand-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
              Settings
            </RouterLink>
          </nav>
        </Transition>
      </div>

    </div>
  </header>
</template>
