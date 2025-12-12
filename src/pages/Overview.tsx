import { useEffect, useState } from 'react'
import { api, SummaryStats } from '../utils/api'
import { Signal, Radio, TrendingUp } from 'lucide-react'

export default function Overview() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const data = await api.getSummary()
      setStats(data)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Default stats if API fails - ensure all properties are defined
  const defaultStats: SummaryStats = {
    total_records: 0,
    unique_cell_ids: 0,
    mean_rssi: -90,
    median_rssi: -90,
    weak_signal_count: 0,
    weak_signal_percent: 0,
    good_signal_count: 0,
    good_signal_percent: 0,
    recommended_towers: 0,
    coverage_area_percent: 0,
  }

  // Safely merge stats with defaults to ensure all properties exist
  const displayStats: SummaryStats = stats ? {
    total_records: stats.total_records ?? 0,
    unique_cell_ids: stats.unique_cell_ids ?? 0,
    mean_rssi: stats.mean_rssi ?? -90,
    median_rssi: stats.median_rssi ?? -90,
    weak_signal_count: stats.weak_signal_count ?? 0,
    weak_signal_percent: stats.weak_signal_percent ?? 0,
    good_signal_count: stats.good_signal_count ?? 0,
    good_signal_percent: stats.good_signal_percent ?? 0,
    recommended_towers: stats.recommended_towers ?? 0,
    coverage_area_percent: stats.coverage_area_percent ?? 0,
  } : defaultStats
  
  const hasApiData = stats !== null

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Overview</h1>
        <p className="text-gray-600">
          Comprehensive analysis of cellular network planning based on real-world signal strength data
        </p>
        {!hasApiData && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <p className="text-sm">
              ⚠️ API connection unavailable. Displaying static content. Some features may be limited.
            </p>
          </div>
        )}
      </div>

      {/* Key Visualizations from Analysis */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Analysis Results</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Overall RSSI Distribution</h3>
            <img 
              src="/images/figure_1_overall_rssi_distribution.png" 
              alt="Overall RSSI Distribution"
              className="w-full rounded-lg shadow-md"
            />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Signal Quality Categories</h3>
            <img 
              src="/images/figure_4c_quality_categories_pie.png" 
              alt="Signal Quality Categories"
              className="w-full rounded-lg shadow-md"
            />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Signal Stability vs Strength</h3>
            <img 
              src="/images/figure_8a_signal_stability_vs_strength.png" 
              alt="Signal Stability vs Strength"
              className="w-full rounded-lg shadow-md"
            />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Coverage Gap Analysis</h3>
            <img 
              src="/images/figure_7a_coverage_gap_analysis.png" 
              alt="Coverage Gap Analysis"
              className="w-full rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            label: 'Total Records',
            value: '184,142',
            icon: Signal,
            color: 'bg-blue-500',
          },
          {
            label: 'Unique Cell IDs',
            value: '353',
            icon: Radio,
            color: 'bg-green-500',
          },
          {
            label: 'Mean RSSI',
            value: `${(displayStats?.mean_rssi ?? -90).toFixed(2)} dBm`,
            icon: TrendingUp,
            color: 'bg-purple-500',
          },
        ].map((metric, idx) => {
          const Icon = metric.icon
          return (
            <div key={idx} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${metric.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Project</h2>
        <div className="space-y-3 text-gray-600">
          <p>
            This dashboard presents a comprehensive analysis of cellular network planning based on
            real-world signal strength data collected from multiple users and body positions.
          </p>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Key Features:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Signal Strength Analysis across body positions</li>
              <li>Coverage Gap Detection</li>
              <li>Network Planning Tools</li>
              <li>Multi-User Analysis</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Methodology</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            'Data Collection',
            'Pattern Analysis',
            'Coverage Analysis',
            'Visualization',
          ].map((step, idx) => (
            <div key={idx} className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary-600 font-bold">{idx + 1}</span>
              </div>
              <p className="text-sm text-gray-600">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

