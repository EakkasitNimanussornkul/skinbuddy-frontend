import { apiClient } from './index'

// UC-16: fetch the active routine + ordered steps (each step includes product data + completed_today)
export const getRoutine = async () => {
  const response = await apiClient.get('/routine/')
  return response.data
}

// UC-17 pre-check: compatibility of a product against the current routine
export const analyzeForRoutine = async (productId: string) => {
  const response = await apiClient.get(`/routine/analyze/${productId}`)
  return response.data
}

// UC-15: propose a routine via the chatbot / RAG pipeline (nothing is saved yet)
export const generateRoutine = async (followupAnswers: string = '') => {
  const response = await apiClient.post('/routine/generate', { followup_answers: followupAnswers })
  return response.data
}

// UC-15: apply a proposed routine as the active routine
export const applyRoutine = async (
  steps: { product_id: string; step_order: number; time_of_day: string; frequency: string }[]
) => {
  const response = await apiClient.post('/routine/apply', { steps })
  return response.data
}

// UC-17: add a product as a routine step
export const addRoutineStep = async (payload: {
  product_id: string
  frequency?: string
  time_of_day?: string
  shelf_item_id?: string | null
}) => {
  const response = await apiClient.post('/routine/steps', payload)
  return response.data
}

// UC-18: remove a step
export const removeRoutineStep = async (stepId: string) => {
  const response = await apiClient.delete(`/routine/steps/${stepId}`)
  return response.data
}

// UC-19: edit a step's schedule — cadence, and optionally which session it runs in
export const updateStepFrequency = async (
  stepId: string,
  frequency: string,
  timeOfDay?: string,
) => {
  const payload: { frequency: string; time_of_day?: string } = { frequency }
  if (timeOfDay) payload.time_of_day = timeOfDay
  const response = await apiClient.patch(`/routine/steps/${stepId}/frequency`, payload)
  return response.data
}

// UC-20: persist a new step order
export const reorderSteps = async (stepIds: string[]) => {
  const response = await apiClient.patch('/routine/reorder', { step_ids: stepIds })
  return response.data
}

// UC-22: mark a step completed for a period (defaults to today on the server)
export const completeStep = async (stepId: string, periodKey?: string) => {
  const response = await apiClient.post(`/routine/steps/${stepId}/complete`, {
    period_key: periodKey ?? null,
  })
  return response.data
}

// UC-22: undo a completion
export const uncompleteStep = async (stepId: string, periodKey?: string) => {
  const url = periodKey
    ? `/routine/steps/${stepId}/complete?period_key=${periodKey}`
    : `/routine/steps/${stepId}/complete`
  const response = await apiClient.delete(url)
  return response.data
}

// UC-27: routine completion history grouped by day
export interface AdherenceDay {
  status: 'complete' | 'partial' | 'missed' | 'none'
  due: number
  done: number
  completed: { step_id: string | null; product_name: string }[]
  missed: { step_id: string | null; product_name: string }[]
  also_completed: { step_id: string | null; product_name: string }[]
}

export interface AdherenceResponse {
  range: { from: string; to: string }
  total_steps: number
  streak: number
  adherence_pct: number
  has_history: boolean
  days: Record<string, AdherenceDay>
}

export const getAdherence = async (weeks = 26): Promise<AdherenceResponse> => {
  const response = await apiClient.get(`/routine/adherence?weeks=${weeks}`)
  return response.data
}
