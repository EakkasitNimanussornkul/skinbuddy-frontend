<template>
    <Transition name="popup">
        <div v-if="authStore.showLoginPopup"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[9999]"
            @click.self="closePopup">
            <div
                class="bg-brand-surface-light dark:bg-brand-surface-dark rounded-3xl p-8 text-center max-w-sm w-[90%] shadow-2xl border border-stone-200 dark:border-stone-800 transition-colors duration-300">

                <!-- Icon badge -->
                <div
                    class="w-16 h-16 rounded-full bg-brand-primary/10 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-5 border border-brand-primary/20 dark:border-orange-700/30">
                    <svg class="w-8 h-8 text-brand-primary dark:text-orange-400" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>

                <!-- Heading -->
                <h2 class="font-serif text-2xl font-bold text-brand-text dark:text-stone-100 mb-2 leading-snug">
                    Sign in to SkinBuddy
                </h2>

                <!-- Subtitle -->
                <p class="text-sm text-brand-text-muted dark:text-stone-400 mb-7 leading-relaxed max-w-[240px] mx-auto">
                    Log in with LINE to access your personalised skin routine.
                </p>

                <!-- Divider -->
                <div class="flex items-center gap-3 mb-6">
                    <div class="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                    <span
                        class="text-[10px] font-bold tracking-widest uppercase text-stone-400 dark:text-stone-500">Continue
                        with</span>
                    <div class="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                </div>

                <div class="flex flex-col gap-3">
                    <!-- LINE login button -->
                    <button @click="handleLineLogin"
                        class="w-full flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-sm">
                        <!-- LINE logo icon -->
                        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path
                                d="M19.952 12.356c0-4.313-4.324-7.821-9.638-7.821S.676 8.043.676 12.356c0 3.866 3.428 7.104 8.058 7.716.314.068.741.207.849.476.097.244.063.626.031.874l-.137.822c-.042.244-.194.954.836.52 1.03-.435 5.559-3.275 7.586-5.606 1.399-1.534 2.053-3.09 2.053-4.802z" />
                        </svg>
                        Log in with LINE
                    </button>
                </div>

                <!-- Fine-print -->
                <p class="mt-6 text-[11px] text-stone-400 dark:text-stone-600 leading-relaxed">
                    By continuing you agree to our
                    <span
                        class="underline underline-offset-2 cursor-pointer hover:text-brand-primary dark:hover:text-orange-400 transition-colors">Terms</span>
                    and
                    <span
                        class="underline underline-offset-2 cursor-pointer hover:text-brand-primary dark:hover:text-orange-400 transition-colors">Privacy
                        Policy</span>.
                </p>

            </div>
        </div>
    </Transition>
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

<style scoped>
.popup-enter-active,
.popup-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}

.popup-enter-from,
.popup-leave-to {
    opacity: 0;
    transform: scale(0.96);
}
</style>