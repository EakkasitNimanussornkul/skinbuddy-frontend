const getToken = () => localStorage.getItem('token') || ''

export const saveSkinType = async (skinType: string, scores: Record<string, number>) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/quiz/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ skinType, scores }),
  })

  if (!response.ok) {
    throw new Error('Failed to save quiz results')
  }

  return await response.json()
}
