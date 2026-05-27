<script setup lang="ts">
import { askSkinBuddy, type ChatMessage } from '@/api/chat'
import { nextTick, ref } from 'vue'

// 1. Session Memory: Lives only while this page is open
const messages = ref<ChatMessage[]>([
    { role: 'bot', text: 'Hi! I am your SkinBuddy AI. Ask me about your routine or any skincare facts!' }
])

const userInput = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

// Function to auto-scroll to the bottom when a new message appears
const scrollToBottom = async () => {
    await nextTick()
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
}

// Function to wipe the current session memory
const startNewChat = () => {
    messages.value = [
        { role: 'bot', text: 'New chat started. What is on your mind?' }
    ]
}

const sendMessage = async () => {
    if (!userInput.value.trim() || isLoading.value) return

    const currentMessage = userInput.value.trim()

    // 1. Save current history to send to backend
    const historyToSend = [...messages.value]

    // 2. Add user's new message to the UI instantly
    messages.value.push({ role: 'user', text: currentMessage })
    userInput.value = ''
    isLoading.value = true
    scrollToBottom()

    try {
        // 3. Call your clean API service
        const data = await askSkinBuddy(currentMessage, historyToSend)

        // 4. Add the bot's reply to the UI
        messages.value.push({ role: 'bot', text: data.answer })

    } catch (error) {
        console.error('Error sending message:', error)
        messages.value.push({ role: 'bot', text: 'Sorry, I am having trouble connecting to the server right now.' })
    } finally {
        isLoading.value = false
        scrollToBottom()
    }
}
</script>

<template>
    <div class="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 pb-[80px]">
        <header class="flex justify-between items-center p-4 bg-white dark:bg-slate-800 shadow-sm z-10">
            <h1 class="font-bold text-lg text-slate-800 dark:text-white">SkinBuddies AI</h1>
            <button @click="startNewChat"
                class="text-sm font-semibold text-[#2E5BFF] bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                New Chat
            </button>
        </header>

        <main ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
            <div v-for="(msg, index) in messages" :key="index"
                :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
                <div :class="[
                    'max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                    msg.role === 'user'
                        ? 'bg-[#2E5BFF] text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'
                ]">
                    {{ msg.text }}
                </div>
            </div>

            <div v-if="isLoading" class="flex justify-start">
                <div
                    class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                    <div class="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
            </div>
        </main>

        <footer class="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <form @submit.prevent="sendMessage" class="flex gap-2 relative">
                <input v-model="userInput" type="text" placeholder="Ask about your routine..."
                    class="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-full py-3 pl-4 pr-12 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-[#2E5BFF] outline-none"
                    :disabled="isLoading" />
                <button type="submit" :disabled="!userInput.trim() || isLoading"
                    class="absolute right-2 top-1.5 p-1.5 bg-[#2E5BFF] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </footer>

    </div>
</template>