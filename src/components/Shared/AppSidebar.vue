<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useAdmin } from '../../composables/useAdmin'
import CollapseTransition from './CollapseTransition.vue'

/**
 * The desktop navigation (lg and up), down the left of every page: the main
 * sections, Explore's categories, the product submission links and the
 * account. Replaces the links and the user menu that sat in the top bar
 * (owner-approved layout B); TopNav keeps only the search.
 */

const route = useRoute()
const authStore = useAuthStore()
// The Review item is for admins only. The role is asked for once per login
// (useAdmin keeps it), here as soon as someone is signed in, since the item is
// always on screen rather than inside a menu.
const { isAdmin, ensureRole } = useAdmin()

// The catalogue's categories, linked the way the old top-bar menu linked them
// (/explore?category=Sun+Care).
const CATEGORIES = ['Cleansers', 'Toners', 'Serums', 'Treatments', 'Moisturizers', 'Exfoliators', 'Sun Care', 'Masks', 'Eye Care']

// A section is current for its own path and anything under it, so Routine
// stays marked on its history page. Home only on itself.
const isCurrent = (path: string) =>
  path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(`${path}/`)

// After Home and Explore, which are drawn on their own.
const MAIN_LINKS = [
  { label: 'Routine', to: '/routine', icon: 'routine' },
  { label: 'Shelves', to: '/shelf', icon: 'shelf' },
  { label: 'SkinBuddy AI', to: '/chat', icon: 'chat' },
] as const

const onExplore = computed(() => isCurrent('/explore'))
const currentCategory = computed(() => (onExplore.value && typeof route.query.category === 'string' ? route.query.category : null))

// Explore's categories: closed by default on every page, opened only with the
// toggle, and left as the user set them until the page is reloaded. Open by
// default on /explore, the list pushed Routine, Shelves, SkinBuddy AI and
// "Products you send" below the fold at 1280x800 (owner check).
const exploreOpen = ref(false)

// The items' fade as the list opens, kept short: the last of the ten starts
// 63ms in and is done by 193ms. Skipped under reduced motion (style.css).
const CATEGORY_STAGGER_MS = 7
const CATEGORY_RISE = { '--rise-duration': '130ms', '--rise-distance': '4px' }
const toggleExplore = () => {
  exploreOpen.value = !exploreOpen.value
}

watch(
  () => authStore.token,
  (token) => {
    if (token) ensureRole()
  },
  { immediate: true },
)

// --- Account -----------------------------------------------------------------
// A guest is asked to sign in, as the old top-bar menu did. A signed-in user
// gets a small menu opening upwards: their skin profile and Log out.
const isMenuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const menuButton = ref<HTMLButtonElement | null>(null)

const displayName = computed(() => (authStore.isAuthenticated ? authStore.user?.name || 'Account' : 'Account'))
const accountDetail = computed(() =>
  authStore.isAuthenticated ? authStore.user?.skin_type || 'Set type' : 'Log in / Register',
)

const toggleMenu = () => {
  if (!authStore.isAuthenticated) {
    authStore.triggerLoginPopup('Sign in to access your account settings and routine.')
    return
  }
  isMenuOpen.value = !isMenuOpen.value
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

const logOut = () => {
  isMenuOpen.value = false
  authStore.logout()
}

const onClickOutside = (event: MouseEvent) => {
  if (menuRoot.value && !menuRoot.value.contains(event.target as Node)) isMenuOpen.value = false
}

// Signing out elsewhere (another tab, an expired session) closes the menu.
watch(
  () => authStore.isAuthenticated,
  (signedIn) => {
    if (!signedIn) isMenuOpen.value = false
  },
)

onMounted(() => window.addEventListener('click', onClickOutside))
onUnmounted(() => window.removeEventListener('click', onClickOutside))

const linkClass = (current: boolean) => [
  'min-h-[46px] px-3 rounded-[14px] flex items-center gap-3 text-[15px] transition-colors',
  current
    ? 'bg-brand-primary-light dark:bg-brand-primary/15 text-brand-primary-strong-hover dark:text-brand-primary-accent font-extrabold'
    : 'text-stone-800 dark:text-stone-100 font-bold hover:bg-brand-bg-light dark:hover:bg-stone-700/60',
]
</script>

<template>
  <div class="app-sidebar hidden lg:flex flex-col sticky top-0 self-start h-screen w-64 shrink-0 z-30 bg-brand-surface-light dark:bg-brand-surface-dark border-r border-brand-surface-border dark:border-stone-700 transition-colors duration-300">
    <!-- The themed thin scrollbar, with its gutter kept even when nothing
         overflows, so opening the categories does not shift the links. -->
    <nav aria-label="Main" class="sidebar-scroll scroll-thin [scrollbar-gutter:stable] flex-1 min-h-0 overflow-y-auto px-3.5 pt-5 pb-3 flex flex-col gap-[18px]">
      <!-- Not marked current: Home below is the one link that says so. -->
      <RouterLink to="/" class="sidebar-brand min-h-12 px-2 flex items-center gap-2.5 rounded-[14px]" :aria-current="undefined">
        <img src="/images/jelly.png" alt="" class="w-[42px] h-[42px] object-contain" />
        <span class="font-serif text-xl font-bold text-stone-800 dark:text-stone-100">SkinBuddy</span>
      </RouterLink>

      <ul class="flex flex-col gap-1 list-none m-0 p-0">
        <li>
          <RouterLink to="/" :class="['sidebar-link', ...linkClass(isCurrent('/'))]" :aria-current="isCurrent('/') ? 'page' : undefined">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-7 9 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            Home
          </RouterLink>
        </li>

        <!-- Explore: the link, and beside it a separate toggle for the list of
             categories. -->
        <li>
          <div :class="['flex items-center gap-1 rounded-[14px]', onExplore ? 'bg-brand-primary-light dark:bg-brand-primary/15' : '']">
            <RouterLink
              to="/explore"
              :class="[
                'sidebar-link sidebar-explore flex-grow min-h-[46px] px-3 rounded-[14px] flex items-center gap-3 text-[15px] transition-colors',
                onExplore
                  ? 'text-brand-primary-strong-hover dark:text-brand-primary-accent font-extrabold'
                  : 'text-stone-800 dark:text-stone-100 font-bold hover:bg-brand-bg-light dark:hover:bg-stone-700/60',
              ]"
              :aria-current="onExplore ? 'page' : undefined"
            >
              <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              Explore
            </RouterLink>
            <button
              type="button"
              class="explore-toggle w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-brand-bg-light dark:hover:bg-stone-700/60 hover:text-brand-primary-strong dark:hover:text-brand-primary-accent transition-colors"
              :aria-expanded="exploreOpen ? 'true' : 'false'"
              aria-controls="sidebar-explore-categories"
              :aria-label="exploreOpen ? 'Hide categories' : 'Show categories'"
              @click="toggleExplore"
            >
              <svg :class="['w-4 h-4 transition-transform duration-200 motion-reduce:transition-none', exploreOpen ? '' : 'rotate-180']" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
            </button>
          </div>
          <!-- A compact two-column grid, so the open list stays short. It
               folds open and shut, the wrapper taking the fold since a margin
               on the folded element would show while it closes, and the items
               fade in one after another as it opens. -->
          <CollapseTransition>
            <div v-show="exploreOpen" class="sidebar-categories-fold">
              <ul
                id="sidebar-explore-categories"
                class="list-none mt-0.5 mb-1.5 ml-3 pl-2 border-l-2 border-brand-surface-border dark:border-stone-600 grid grid-cols-2 gap-0.5"
                :style="CATEGORY_RISE"
              >
                <li v-for="(category, i) in CATEGORIES" :key="category" class="rise-in" :style="{ '--rise-delay': `${i * CATEGORY_STAGGER_MS}ms` }">
                  <RouterLink
                    :to="{ path: '/explore', query: { category } }"
                    :class="[
                      'sidebar-category min-h-10 px-2 rounded-[10px] flex items-center text-[13px] leading-tight break-words transition-colors',
                      currentCategory === category
                        ? 'bg-brand-primary-light/70 dark:bg-brand-primary/15 text-brand-primary-strong-hover dark:text-brand-primary-accent font-extrabold'
                        : 'text-stone-700 dark:text-stone-200 font-semibold hover:bg-brand-bg-light dark:hover:bg-stone-700/60',
                    ]"
                    :aria-current="currentCategory === category ? 'true' : undefined"
                  >
                    {{ category }}
                  </RouterLink>
                </li>
                <li class="col-span-2 rise-in" :style="{ '--rise-delay': `${CATEGORIES.length * CATEGORY_STAGGER_MS}ms` }">
                  <RouterLink
                    to="/submissions/new"
                    class="sidebar-category-submit mt-1.5 min-h-11 px-2.5 py-2 rounded-xl flex flex-col justify-center gap-0.5 bg-brand-bg-light dark:bg-stone-700/50 hover:bg-brand-primary-light dark:hover:bg-brand-primary/15 transition-colors"
                  >
                    <!-- One line, so the link reads with a space between its parts. -->
                    <span class="text-[13px] font-bold text-stone-600 dark:text-stone-300">Couldn't find your product?</span> <span class="text-sm font-extrabold text-brand-primary-strong dark:text-brand-primary">Submit it here</span>
                  </RouterLink>
                </li>
              </ul>
            </div>
          </CollapseTransition>
        </li>

        <li v-for="link in MAIN_LINKS" :key="link.to">
          <RouterLink :to="link.to" :class="['sidebar-link', ...linkClass(isCurrent(link.to))]" :aria-current="isCurrent(link.to) ? 'page' : undefined">
            <svg v-if="link.icon === 'routine'" class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
            <svg v-else-if="link.icon === 'shelf'" class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16" /></svg>
            <svg v-else class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z" /></svg>
            {{ link.label }}
          </RouterLink>
        </li>
      </ul>

      <!-- Products you send (feat/22). -->
      <div class="pt-3.5 border-t border-brand-surface-border dark:border-stone-700 flex flex-col gap-1">
        <h2 id="sidebar-products-you-send" class="m-0 px-3 pb-1 text-xs font-extrabold uppercase tracking-[0.1em] text-stone-600 dark:text-stone-300">Products you send</h2>
        <ul class="list-none m-0 p-0 flex flex-col gap-1" aria-labelledby="sidebar-products-you-send">
          <li>
            <RouterLink
              to="/submissions/new"
              class="sidebar-submit mb-1 min-h-[46px] px-3 rounded-[14px] border border-dashed border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong dark:text-brand-primary flex items-center gap-3 text-[15px] font-extrabold hover:bg-brand-primary-light dark:hover:bg-brand-primary/15 transition-colors"
            >
              <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Submit a product
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/submissions" :class="['sidebar-my-submissions', ...linkClass(route.path === '/submissions')]" :aria-current="route.path === '/submissions' ? 'page' : undefined">
              <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v12H5.2L4 17.2z" /><path d="M8 9h8M8 12h5" /></svg>
              My submissions
            </RouterLink>
          </li>
          <!-- Admins only. What the page offers, not security: every admin
               route answers 403 to anyone else. -->
          <li v-if="isAdmin">
            <RouterLink to="/admin/submissions" :class="['sidebar-review', ...linkClass(isCurrent('/admin/submissions'))]" :aria-current="isCurrent('/admin/submissions') ? 'page' : undefined">
              <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
              Review
              <span class="ml-auto text-[11px] font-extrabold tracking-[0.06em] text-stone-600 dark:text-stone-300">ADMIN</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Settings and the account, kept in view under the scrolling links. -->
    <div class="shrink-0 px-3.5 pt-3.5 pb-5 border-t border-brand-surface-border dark:border-stone-700 flex flex-col gap-1">
      <RouterLink to="/settings" :class="['sidebar-settings', ...linkClass(isCurrent('/settings'))]" :aria-current="isCurrent('/settings') ? 'page' : undefined">
        <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
        Settings
      </RouterLink>

      <div ref="menuRoot" class="relative" @keydown="onMenuKeydown">
        <!-- Opens upwards, so it rises from its bottom edge. -->
        <Transition name="menu-rise">
          <ul
            v-if="isMenuOpen"
            id="sidebar-account-menu"
            aria-label="Account"
            class="list-none m-0 absolute bottom-full left-0 right-0 mb-2 p-1.5 origin-bottom rounded-2xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark shadow-xl z-40 flex flex-col gap-0.5"
          >
            <li>
              <RouterLink to="/profile" class="sidebar-profile min-h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-bold text-stone-800 dark:text-stone-100 hover:bg-brand-bg-light dark:hover:bg-stone-700/60" @click="closeMenu()">
                <svg class="w-5 h-5 shrink-0 text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0114 0" /></svg>
                Your skin profile
              </RouterLink>
            </li>
            <li>
              <button type="button" class="sidebar-logout w-full min-h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-bold text-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30" @click="logOut">
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 16l4-4-4-4M21 12H9M13 20H6a2 2 0 01-2-2V6a2 2 0 012-2h7" /></svg>
                Log out
              </button>
            </li>
          </ul>
        </Transition>

        <button
          ref="menuButton"
          type="button"
          class="account-button w-full min-h-14 px-2.5 py-1.5 rounded-2xl border border-brand-surface-border dark:border-stone-600 bg-brand-bg-light dark:bg-stone-700/40 hover:border-brand-primary-strong dark:hover:border-brand-primary flex items-center gap-2.5 text-left transition-colors"
          :aria-expanded="authStore.isAuthenticated ? (isMenuOpen ? 'true' : 'false') : undefined"
          :aria-controls="isMenuOpen ? 'sidebar-account-menu' : undefined"
          @click.stop="toggleMenu"
        >
          <span class="w-[38px] h-[38px] rounded-full overflow-hidden shrink-0 bg-brand-surface-border dark:bg-stone-600 flex items-center justify-center">
            <img v-if="authStore.isAuthenticated && authStore.user?.picture" :src="authStore.user.picture" alt="" class="w-full h-full object-cover" />
            <svg v-else class="w-5 h-5 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0114 0" /></svg>
          </span>
          <span class="flex flex-col flex-grow min-w-0">
            <span class="account-name text-sm font-extrabold text-stone-800 dark:text-stone-100 truncate">{{ displayName }}</span> <span class="account-detail text-xs font-bold text-stone-600 dark:text-stone-300 truncate">{{ accountDetail }}</span>
          </span>
          <span v-if="authStore.isAuthenticated" class="sr-only">, account menu</span>
          <svg class="w-4 h-4 shrink-0 text-stone-600 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
        </button>
      </div>

      <!-- The policies, readable by anyone (feat/25). Small text, full-height
           targets. -->
      <div class="sidebar-legal -mb-2 px-1.5 flex items-center gap-1 text-xs font-bold text-stone-600 dark:text-stone-300">
        <RouterLink to="/privacy" class="sidebar-privacy min-h-11 px-1.5 inline-flex items-center rounded-lg hover:text-brand-primary-strong dark:hover:text-brand-primary-accent hover:underline">Privacy Policy</RouterLink>
        <span aria-hidden="true">·</span>
        <RouterLink to="/terms" class="sidebar-terms min-h-11 px-1.5 inline-flex items-center rounded-lg hover:text-brand-primary-strong dark:hover:text-brand-primary-accent hover:underline">Terms</RouterLink>
      </div>
    </div>
  </div>
</template>
