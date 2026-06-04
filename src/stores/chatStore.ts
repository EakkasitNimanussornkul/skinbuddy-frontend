import type { ChatMessage } from '@/api/chat'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore(
  'chat',
  () => {
    const messages = ref<ChatMessage[]>([
      {
        role: 'bot',
        text: 'Hi! I am your SkinBuddy AI. Ask me about your routine or any skincare facts!',
      },
    ])

    const resetChat = () => {
      messages.value = [{ role: 'bot', text: 'New chat started. What is on your mind?' }]
    }

    return { messages, resetChat }
  },
  {
    // Persist to sessionStorage so it survives navigation but clears on tab close
    persist: {
      storage: sessionStorage,
    },
  },
)
