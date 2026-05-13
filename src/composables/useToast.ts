import { ref } from 'vue'

// Define the shape of our notification
export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

// We define this OUTSIDE the function so it acts as global state!
const toasts = ref<Toast[]>([])

export function useToast() {
  const addToast = (message: string, type: ToastType = 'info', duration = 3000) => {
    // Generate a random ID
    const id = Math.random().toString(36).substring(2, 9)

    toasts.value.push({ id, message, type })

    // Auto-remove after X milliseconds
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    addToast,
    removeToast
  }
}
