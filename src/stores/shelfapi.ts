const getToken = () => localStorage.getItem('token') || ''

// 1. Fetch user's shelf from database
export const fetchUserShelf = async () => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/shelf`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  })
  if (!response.ok) throw new Error('Failed to fetch shelf')
  return await response.json()
}

// 2. Add a new product to the database
export const addProductToBackend = async (productData: any) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/shelf/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(productData),
  })
  if (!response.ok) throw new Error('Failed to add product')
  return await response.json()
}
