<script setup lang="ts">
import { askSkinBuddy } from '@/api/chat'
import { generateRoutine, applyRoutine } from '@/api/routineApi'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chatStore'
import { nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RoutineProposalCard from '@/components/Routine/RoutineProposalCard.vue'

const chatStore = useChatStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const userInput = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

// Routine generation sub-flow (UC-15). 'awaiting-concerns' = the bot asked the
// follow-up question and is waiting for the user's next message to generate.
const routineStage = ref<'idle' | 'awaiting-concerns' | 'generating'>('idle')

const scrollToBottom = async () => {
    await nextTick()
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
}

const startNewChat = () => {
    chatStore.resetChat()
    routineStage.value = 'idle'
}

// UC-15 step 1-3: opened from the routine page -> auto-send + ask follow-up.
const startRoutineFlow = () => {
    chatStore.messages.push({ role: 'user', text: 'Make me a skincare routine' })
    chatStore.messages.push({
        role: 'bot',
        text: 'I\'d love to build one from the products in your storage! 🌿 Any specific concerns you\'d like to focus on — like acne, dryness, sensitivity, or anti-aging? Or just say "no" for a balanced routine.',
    })
    routineStage.value = 'awaiting-concerns'
    scrollToBottom()
}

onMounted(() => {
    if (route.query.intent === 'generate-routine') {
        // Clear the query so a reload/HMR doesn't re-trigger the flow.
        router.replace({ query: {} })
        startRoutineFlow()
    }
})

// UC-15 step 4-6: retrieve context + propose a routine card from the shelf.
const runRoutineGeneration = async (concerns: string) => {
    routineStage.value = 'generating'
    isLoading.value = true
    scrollToBottom()
    try {
        const answers = /^\s*(no|none|nope|n\/?a|nothing)\s*$/i.test(concerns) ? '' : concerns
        const data = await generateRoutine(answers)
        if (data.steps?.length) {
            const names = data.steps.map((s: any) => s.product_name).join(', ')
            chatStore.messages.push({
                role: 'bot',
                text: `Here's a routine I put together using your products: ${names}.`,
                kind: 'routine',
                routine: data.steps,
            })
        } else {
            chatStore.messages.push({ role: 'bot', text: "I couldn't build a routine from your current products." })
        }
    } catch (err: any) {
        // 422 => no products in storage; otherwise generic/LLM failure.
        const detail = err?.response?.data?.detail
        chatStore.messages.push({ role: 'bot', text: detail || 'Something went wrong generating your routine. Please try again.' })
    } finally {
        isLoading.value = false
        routineStage.value = 'idle'
        scrollToBottom()
    }
}

// UC-15 step 7-8: apply the proposed routine as the active routine.
const applyProposedRoutine = async (msg: any) => {
    try {
        await applyRoutine(
            msg.routine.map((s: any, i: number) => ({
                product_id: s.product_id,
                step_order: i + 1,
                time_of_day: s.time_of_day || 'both',
                frequency: s.frequency || 'daily',
            }))
        )
        msg.applied = true
        chatStore.messages.push({ role: 'bot', text: '✅ Done! Your new routine is active. You can view and tweak it on the Routine page.' })
    } catch {
        chatStore.messages.push({ role: 'bot', text: 'Sorry, I could not apply that routine. Please try again.' })
    } finally {
        scrollToBottom()
    }
}

// UC-15 A2: user asks to adjust -> loop back to the follow-up question.
const adjustProposedRoutine = () => {
    chatStore.messages.push({ role: 'bot', text: 'No problem — what would you like to change or focus on?' })
    routineStage.value = 'awaiting-concerns'
    scrollToBottom()
}

const sendMessage = async () => {
    if (!userInput.value.trim() || isLoading.value) return

    const currentMessage = userInput.value.trim()

    // If we're gathering routine concerns, the next message drives generation.
    if (routineStage.value === 'awaiting-concerns') {
        chatStore.messages.push({ role: 'user', text: currentMessage })
        userInput.value = ''
        scrollToBottom()
        await runRoutineGeneration(currentMessage)
        return
    }

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
                <div
                    class="w-9 h-9 rounded-full overflow-hidden border border-brand-primary/20 dark:border-orange-700/30 flex items-center justify-center flex-shrink-0">
                    <img src="/images/jelly.png" alt="SkinBuddy" class="w-full h-full object-cover" />
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
                <div v-if="msg.role === 'bot'"
                    class="w-7 h-7 rounded-full overflow-hidden border border-brand-primary/20 dark:border-orange-700/30 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <img src="/images/jelly.png" alt="SkinBuddy" class="w-full h-full object-cover" />
                </div>

                <!-- Routine proposal card (UC-15) -->
                <div v-if="msg.role === 'bot' && msg.kind === 'routine'" class="max-w-[85%] w-full">
                    <RoutineProposalCard
                        :steps="msg.routine || []"
                        :applied="msg.applied"
                        @use="applyProposedRoutine(msg)"
                        @adjust="adjustProposedRoutine"
                        @view="router.push('/routine')"
                    />
                </div>

                <!-- Bubble -->
                <div v-else :class="[
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
                    class="w-7 h-7 rounded-full overflow-hidden border border-brand-primary/20 dark:border-orange-700/30 flex items-center justify-center flex-shrink-0">
                    <img src="/images/jelly.png" alt="SkinBuddy" class="w-full h-full object-cover" />
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