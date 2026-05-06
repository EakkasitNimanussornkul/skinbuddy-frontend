<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
    <h1 class="text-4xl font-serif text-slate-900 mb-4">Welcome to SkinBuddy</h1>
    <p class="text-slate-500 mb-8">Your personalized skincare companion.</p>

    <RouterLink
      to="/quiz"
      class="bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow-sm"
    >
      Take the Skin Quiz
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
