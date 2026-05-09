<template>
    <div class="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans px-4">
        <div class="text-6xl mb-6">😵</div>
        <h1 class="text-3xl font-serif text-slate-900 mb-2">Something went wrong</h1>
        <p class="text-slate-500 mb-8 text-center max-w-sm">{{ message }}</p>
        <button @click="router.push('/')"
            class="bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow-sm">
            Go Home
        </button>
    </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

const router = useRouter()
const route = useRoute()

const message = (route.query.message as string) || 'An unexpected error occurred. Please try again.'
</script>