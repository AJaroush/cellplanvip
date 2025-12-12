import axios from 'axios'

// Use environment variable for API base URL, fallback to /api for local development
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export interface SummaryStats {
  total_records: number
  unique_cell_ids: number
  mean_rssi: number
  median_rssi: number
  weak_signal_count: number
  weak_signal_percent: number
  good_signal_count: number
  good_signal_percent: number
  recommended_towers: number
  coverage_area_percent: number
}

export interface TowerRecommendation {
  cluster_id?: string
  num_cells?: number
  avg_signal_dbm?: number
  recommended_towers?: number
  priority?: string
  x?: number
  y?: number
  tower_id?: number
}

export interface CoverageSummary {
  cell_id: string
  rssi_mean: number
  rssi_std: number
  rssi_min: number
  rssi_max: number
  rssi_count: number
  stability_score: number
  coverage_score: number
  low_quality: boolean
}

export interface SignalData {
  timestamp?: number
  cell_id?: number
  rssi?: number
  body_position?: string
  x?: number
  y?: number
  [key: string]: any
}

export const api = {
  getSummary: async (): Promise<SummaryStats | null> => {
    try {
      const response = await axios.get<SummaryStats>(`${API_BASE}/summary`)
      return response.data
    } catch (error) {
      console.error('Error fetching summary:', error)
      return null
    }
  },

  getTowers: async (): Promise<TowerRecommendation[]> => {
    try {
      const response = await axios.get<TowerRecommendation[]>(`${API_BASE}/towers`)
      return response.data
    } catch (error) {
      console.error('Error fetching towers:', error)
      return []
    }
  },

  getCoverage: async (): Promise<CoverageSummary[]> => {
    try {
      const response = await axios.get<CoverageSummary[]>(`${API_BASE}/coverage`)
      return response.data
    } catch (error) {
      console.error('Error fetching coverage:', error)
      return []
    }
  },

  getData: async (user?: string): Promise<SignalData[]> => {
    try {
      const endpoint = user && user !== 'all' ? `${API_BASE}/data/${user}` : `${API_BASE}/data`
      const response = await axios.get<SignalData[]>(endpoint)
      return response.data
    } catch (error) {
      console.error('Error fetching data:', error)
      return []
    }
  },

  getUserSummary: async (user: string): Promise<CoverageSummary[]> => {
    try {
      const response = await axios.get<CoverageSummary[]>(`${API_BASE}/user/${user}/summary`)
      return response.data
    } catch (error) {
      console.error('Error fetching user summary:', error)
      return []
    }
  },
}

