<script setup lang="ts">
import { askSkinBuddy } from '@/api/chat'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chatStore'
import { nextTick, ref } from 'vue'

const chatStore = useChatStore()
const authStore = useAuthStore()

const userInput = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

const scrollToBottom = async () => {
    await nextTick()
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
}

const startNewChat = () => {
    chatStore.resetChat()
}

const sendMessage = async () => {
    if (!userInput.value.trim() || isLoading.value) return

    const currentMessage = userInput.value.trim()
    const historyToSend = [...chatStore.messages]

    chatStore.messages.push({ role: 'user', text: currentMessage })
    userInput.value = ''
    isLoading.value = true
    scrollToBottom()

    try {
        const data = await askSkinBuddy(currentMessage, historyToSend)
        chatStore.messages.push({ role: 'bot', text: data.answer })
    } catch (error) {
        console.error('Error sending message:', error)
        chatStore.messages.push({ role: 'bot', text: 'Sorry, I am having trouble connecting to the server right now.' })
    } finally {
        isLoading.value = false
        scrollToBottom()
    }
}
</script>

<template>
    <div
        class="flex flex-col h-screen bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300 pb-[80px]">

        <!-- Header -->
        <header
            class="flex justify-between items-center px-5 py-4 bg-brand-surface-light dark:bg-brand-surface-dark border-b border-stone-200 dark:border-stone-800 z-10 transition-colors duration-300">
            <div class="flex items-center gap-3">
                <!-- Bot avatar -->
                <div
                    class="w-9 h-9 rounded-full bg-brand-primary/10 dark:bg-orange-900/30 border border-brand-primary/20 dark:border-orange-700/30 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 100 100" class="w-5 h-5 text-brand-primary dark:text-orange-400">
                        <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.2" />
                        <circle cx="35" cy="40" r="7" fill="currentColor" />
                        <circle cx="65" cy="40" r="7" fill="currentColor" />
                        <path d="M 32 58 Q 50 72 68 58" stroke="currentColor" stroke-width="8" stroke-linecap="round"
                            fill="transparent" />
                    </svg>
                </div>
                <div>
                    <h1 class="font-serif font-bold text-base text-brand-text dark:text-stone-100 leading-tight">
                        SkinBuddy AI</h1>
                    <p class="text-[11px] text-brand-text-muted dark:text-stone-500 leading-none">Your skin, your
                        routine</p>
                </div>
            </div>

            <!-- New Chat button -->
            <button @click="startNewChat"
                class="flex items-center gap-1.5 text-xs font-bold text-brand-primary dark:text-orange-400 bg-brand-primary/10 dark:bg-orange-900/20 hover:bg-brand-primary/20 dark:hover:bg-orange-900/40 active:scale-[0.97] px-3.5 py-2 rounded-full transition-all border border-brand-primary/20 dark:border-orange-700/30">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
                New Chat
            </button>
        </header>

        <!-- Messages -->
        <main ref="chatContainer" class="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            <div v-for="(msg, index) in chatStore.messages" :key="index"
                :class="['flex items-end gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start']">
                <!-- Bot avatar -->
                <div v-if="msg.role === 'bot'"
                    class="w-7 h-7 rounded-full bg-brand-primary/10 dark:bg-orange-900/30 border border-brand-primary/20 dark:border-orange-700/30 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <svg viewBox="0 0 100 100" class="w-4 h-4 text-brand-primary dark:text-orange-400">
                        <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.2" />
                        <circle cx="35" cy="40" r="7" fill="currentColor" />
                        <circle cx="65" cy="40" r="7" fill="currentColor" />
                        <path d="M 32 58 Q 50 72 68 58" stroke="currentColor" stroke-width="8" stroke-linecap="round"
                            fill="transparent" />
                    </svg>
                </div>

                <!-- Bubble -->
                <div :class="[
                    'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                    msg.role === 'user'
                        ? 'bg-brand-primary text-white rounded-br-sm'
                        : 'bg-brand-surface-light dark:bg-brand-surface-dark text-brand-text dark:text-stone-200 rounded-bl-sm border border-stone-200 dark:border-stone-700'
                ]">
                    {{ msg.text }}
                </div>

                <!-- User avatar — real profile picture, initials, or icon fallback -->
                <div v-if="msg.role === 'user'"
                    class="w-7 h-7 rounded-full overflow-hidden border border-brand-primary/30 dark:border-orange-600/40 bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <img v-if="authStore.user?.picture" :src="authStore.user.picture"
                        :alt="authStore.user?.name || 'User'" class="w-full h-full object-cover" />
                    <span v-else-if="authStore.user?.name"
                        class="text-[10px] font-bold text-brand-primary dark:text-orange-400 leading-none">
                        {{ authStore.user.name.charAt(0).toUpperCase() }}
                    </span>
                    <svg v-else class="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
            </div>

            <!-- Typing indicator -->
            <div v-if="isLoading" class="flex items-end gap-2 justify-start">
                <div
                    class="w-7 h-7 rounded-full bg-brand-primary/10 dark:bg-orange-900/30 border border-brand-primary/20 dark:border-orange-700/30 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 100 100" class="w-4 h-4 text-brand-primary dark:text-orange-400">
                        <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.2" />
                        <circle cx="35" cy="40" r="7" fill="currentColor" />
                        <circle cx="65" cy="40" r="7" fill="currentColor" />
                        <path d="M 32 58 Q 50 72 68 58" stroke="currentColor" stroke-width="8" stroke-linecap="round"
                            fill="transparent" />
                    </svg>
                </div>
                <div
                    class="bg-brand-surface-light dark:bg-brand-surface-dark border border-stone-200 dark:border-stone-700 rounded-2xl rounded-bl-sm px-4 py-3.5 shadow-sm flex gap-1.5 items-center">
                    <div class="w-2 h-2 bg-brand-primary/50 dark:bg-orange-400/50 rounded-full animate-bounce"
                        style="animation-delay: 0s" />
                    <div class="w-2 h-2 bg-brand-primary/50 dark:bg-orange-400/50 rounded-full animate-bounce"
                        style="animation-delay: 0.15s" />
                    <div class="w-2 h-2 bg-brand-primary/50 dark:bg-orange-400/50 rounded-full animate-bounce"
                        style="animation-delay: 0.3s" />
                </div>
            </div>
        </main>

        <!-- Input footer -->
        <footer
            class="px-4 py-3 bg-brand-surface-light dark:bg-brand-surface-dark border-t border-stone-200 dark:border-stone-800 transition-colors duration-300">
            <div class="flex gap-2 items-center relative">
                <input v-model="userInput" type="text" placeholder="Ask about your routine…"
                    @keydown.enter.prevent="sendMessage" :disabled="isLoading"
                    class="flex-1 bg-brand-bg-light dark:bg-brand-bg-dark border border-stone-200 dark:border-stone-700 rounded-full py-3 pl-5 pr-12 text-sm text-brand-text dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-orange-400/30 transition-all disabled:opacity-50" />
                <button @click="sendMessage" :disabled="!userInput.trim() || isLoading"
                    class="absolute right-1.5 top-1.5 w-9 h-9 bg-brand-primary hover:bg-orange-800 active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-all shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </footer>

    </div>
</template>