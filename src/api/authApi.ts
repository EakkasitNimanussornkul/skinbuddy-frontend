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
