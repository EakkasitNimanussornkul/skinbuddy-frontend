import { apiClient } from './index'
export const exchangeLineCode = async (code: string) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/line`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange authorization code')
  }

  return await response.json()
}

// Add this below exchangeLineCode
export const updateUserSkinType = async (skinType: string) => {
  const response = await apiClient.patch('/auth/me', { skin_type: skinType })
  return response.data
}
