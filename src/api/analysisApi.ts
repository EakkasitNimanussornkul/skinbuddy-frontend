import { apiClient } from './index'

export interface SymptomEntry {
  symptom: string
  severity: number
}

// UC-23: is there already a log for the current week?
export const getCurrentLog = async () => {
  const response = await apiClient.get('/analysis/log/current')
  return response.data
}

// UC-23 -> UC-24: submit (or update) this week's log; returns { log, report }
export const submitLog = async (payload: {
  symptoms: SymptomEntry[]
  affected_areas: string[]
  notes?: string | null
  week_start?: string | null
}) => {
  const response = await apiClient.post('/analysis/log', payload)
  return response.data
}

// UC-25: a specific week's report (defaults to current week)
export const getReport = async (week?: string) => {
  const url = week ? `/analysis/report?week=${week}` : '/analysis/report'
  const response = await apiClient.get(url)
  return response.data
}

// UC-26: chronological timeline of logs + reports
export const getHistory = async () => {
  const response = await apiClient.get('/analysis/history')
  return response.data
}
