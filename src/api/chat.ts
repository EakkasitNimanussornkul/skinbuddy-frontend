export interface ChatMessage {
  role: 'user' | 'bot'
  text: string
  // Rich message support for the in-chat routine proposal (UC-15).
  // Extra fields are ignored by the backend /chat/ask history parser.
  kind?: 'text' | 'routine'
  routine?: any[] // proposed steps when kind === 'routine'
  applied?: boolean // whether this proposal has been applied
}

export interface ChatResponse {
  answer: string
}

export const askSkinBuddy = async (
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> => {
  // 1. Grab the token inside the API call
  const token = localStorage.getItem('access_token')

  // 2. Make the fetch request
  const response = await fetch('http://localhost:8000/chat/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: message,
      history: history,
    }),
  })

  if (!response.ok) {
    throw new Error('Network response was not ok')
  }

  // 3. Return the parsed JSON
  return await response.json()
}
