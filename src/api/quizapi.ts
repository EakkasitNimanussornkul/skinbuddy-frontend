import { apiClient } from './index'

export const saveSkinType = async (skinType: string, scores: Record<string, number>) => {
  // apiClient automatically adds the URL, the Headers, and the correct access_token!
  const response = await apiClient.post('/quiz/save', {
    skinType,
    scores
  })

  return response.data
}
