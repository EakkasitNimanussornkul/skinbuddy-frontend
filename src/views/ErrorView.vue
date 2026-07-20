<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/Shared/EmptyState.vue'

const router = useRouter()
const route = useRoute()

// Pull dynamic message if redirected with context, otherwise default to a clean 404 text
const message = (route.query.message as string) || "The page you are looking for doesn't exist, has been removed, or the URL signature was entered incorrectly."
const title = (route.query.title as string) || "Page Not Found"
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-brand-bg-light dark:bg-brand-bg-dark font-sans px-4 transition-colors duration-300">

    <EmptyState
      :title="title"
      :message="message"
      action-label="Return Home"
      @action="router.push('/')"
    >
      <!-- Customizing the slot icon for a global routing error style -->
      <template #icon>
        <svg class="w-10 h-10 text-brand-text-muted/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </template>
    </EmptyState>

  </div>
</template>
