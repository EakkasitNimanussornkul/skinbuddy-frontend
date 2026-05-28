<template>
    <div v-if="authStore.showLoginPopup"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999] transition-opacity duration-300">

        <div
            class="bg-white dark:bg-clinical-surface p-8 rounded-2xl text-center max-w-sm w-[90%] shadow-2xl border border-slate-100 dark:border-slate-800">

            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Authentication Required
            </h2>

            <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Please log in with LINE to access this feature.
            </p>

            <div class="flex flex-col gap-3">
                <button @click="handleLineLogin"
                    class="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm">
                    Log in with LINE
                </button>

                <button @click="closePopup"
                    class="w-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-bold py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                    Cancel
                </button>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const handleLineLogin = () => {
    authStore.loginWithLine()
}

const closePopup = () => {
    authStore.showLoginPopup = false
}
</script>