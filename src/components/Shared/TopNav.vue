<script setup lang="ts">
import SearchAutocompleteInput from './SearchAutocompleteInput.vue'

// The desktop top bar (lg and up), over the content column: the search, and
// nothing else. The links, Explore's categories and the account moved to
// AppSidebar (owner-approved layout B). Kept 80px tall (h-20), the header
// height the pages were laid out under.
</script>

<template>
  <header class="top-nav hidden lg:flex sticky top-0 z-50 h-20 items-center px-7 bg-brand-surface-light/90 dark:bg-brand-surface-dark/90 backdrop-blur-md border-b border-brand-surface-border dark:border-stone-700 transition-colors duration-300">
    <div class="w-full max-w-[720px]">
      <SearchAutocompleteInput placeholder="Search products, brands or ingredients" />
    </div>
  </header>
</template>
