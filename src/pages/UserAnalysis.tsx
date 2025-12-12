import { useEffect, useState } from 'react'
import { api, SignalData, CoverageSummary } from '../utils/api'
import { normalizePosition, getPositionColor, getPositionIcon } from '../utils/bodyPositions'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { Activity, MapPin, TrendingUp, Signal } from 'lucide-react'

export default function UserAnalysis() {
  const [data, setData] = useState<SignalData[]>([])
  const [summary, setSummary] = useState<CoverageSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      // Always load all users data
      const signalData = await api.getData()
      setData(signalData)
      
      const coverage = await api.getCoverage()
      setSummary(coverage.slice(0, 50))
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

  // Prepare data for visualizations with normalized positions

  // Normalize and group by body position
  // Filter out invalid RSSI values (0, null, undefined, or extremely positive values)
  const bodyPositionData = data
    .filter(d => {
      const hasPosition = d.body_position && d.body_position.trim() !== ''
      const hasValidRssi = d.rssi !== undefined && 
                          d.rssi !== null && 
                          d.rssi !== 0 && 
                          !isNaN(d.rssi) &&
                          d.rssi < 0 // RSSI should be negative
      return hasPosition && hasValidRssi
    })
    .reduce((acc: any, d) => {
      const normalized = normalizePosition(d.body_position)
      if (!acc[normalized]) {
        acc[normalized] = []
      }
      acc[normalized].push(d.rssi!)
      return acc
    }, {})

  // Define preferred order for positions
  const positionOrder = ['Hand', 'Bag', 'Hips', 'Torso', 'Pocket', 'Backpack', 'Arm', 'Leg', 'Head', 'Other']
  
  const bodyPositionStats = Object.entries(bodyPositionData)
    .map(([position, values]: [string, any]) => {
      const nums = values.filter((v: number) => !isNaN(v))
      if (nums.length === 0) return null
      const mean = nums.reduce((a: number, b: number) => a + b, 0) / nums.length
      const sorted = [...nums].sort((a: number, b: number) => a - b)
      return {
        position,
        icon: getPositionIcon(position),
        mean,
        min: Math.min(...nums),
        max: Math.max(...nums),
        median: sorted[Math.floor(sorted.length / 2)],
        count: nums.length,
        std: Math.sqrt(nums.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / nums.length),
        order: positionOrder.indexOf(position) >= 0 ? positionOrder.indexOf(position) : 999,
      }
    })
    .filter((stat): stat is NonNullable<typeof stat> => stat !== null)
    .sort((a, b) => a.order - b.order) // Sort by preferred order

  // RSSI distribution by position
  const rssiDistributionByPosition = bodyPositionStats.map(stat => {
    const pos = stat.position
    return {
      position: `${stat.icon} ${pos}`,
      excellent: data.filter(d => normalizePosition(d.body_position) === pos && d.rssi! > -70).length,
      good: data.filter(d => normalizePosition(d.body_position) === pos && d.rssi! > -85 && d.rssi! <= -70).length,
      fair: data.filter(d => normalizePosition(d.body_position) === pos && d.rssi! > -100 && d.rssi! <= -85).length,
      poor: data.filter(d => normalizePosition(d.body_position) === pos && d.rssi! <= -100).length,
    }
  })

  // Radar chart data
  const radarData = bodyPositionStats.map(stat => ({
    position: stat.position,
    'Mean RSSI': Math.max(0, stat.mean + 140), // Normalize to 0-100 scale
    'Stability': Math.min(100, stat.std * 10), // Lower std = higher stability
    'Count': Math.min(100, (stat.count / Math.max(...bodyPositionStats.map(s => s.count))) * 100),
  }))

  const hasLocation = data.some(d => d.x !== undefined && d.y !== undefined)
  const locationData = hasLocation
    ? data
        .filter(d => d.x !== undefined && d.y !== undefined && d.rssi !== undefined)
        .slice(0, 2000)
        .map(d => ({ 
          x: d.x, 
          y: d.y, 
          rssi: d.rssi,
          position: normalizePosition(d.body_position),
        }))
    : []

  // Time series if timestamp available
  const timeSeriesData = data
    .filter(d => d.timestamp && d.rssi !== undefined)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .slice(0, 500)
    .map((d, idx) => ({ 
      time: idx, 
      rssi: d.rssi,
      position: normalizePosition(d.body_position),
    }))

  // Signal quality categories - count records with RSSI
  const totalWithRssi = data.filter(d => d.rssi !== undefined).length
  const signalQuality = {
    excellent: data.filter(d => d.rssi !== undefined && d.rssi! > -70).length,
    good: data.filter(d => d.rssi !== undefined && d.rssi! > -85 && d.rssi! <= -70).length,
    fair: data.filter(d => d.rssi !== undefined && d.rssi! > -100 && d.rssi! <= -85).length,
    poor: data.filter(d => d.rssi !== undefined && d.rssi! <= -100).length,
    total: totalWithRssi,
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Signal Analysis Dashboard</h1>
        <p className="text-blue-100">Comprehensive signal analysis across all users and body positions</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{data.length.toLocaleString()}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mean RSSI</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.length > 0 && data.some(d => d.rssi)
                  ? `${(data.filter(d => d.rssi).reduce((sum, d) => sum + (d.rssi || 0), 0) / data.filter(d => d.rssi).length).toFixed(2)} dBm`
                  : 'N/A'}
              </p>
            </div>
            <Signal className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Cells</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(data.filter(d => d.cell_id).map(d => d.cell_id)).size}
              </p>
            </div>
            <MapPin className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Body Positions</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(data.filter(d => d.body_position).map(d => normalizePosition(d.body_position))).size}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Signal Quality Distribution */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Signal Quality Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Excellent (>-70 dBm)', value: signalQuality.excellent, color: 'bg-green-500' },
            { label: 'Good (-70 to -85 dBm)', value: signalQuality.good, color: 'bg-blue-500' },
            { label: 'Fair (-85 to -100 dBm)', value: signalQuality.fair, color: 'bg-yellow-500' },
            { label: 'Poor (<-100 dBm)', value: signalQuality.poor, color: 'bg-red-500' },
          ].map((item, idx) => {
            const percentage = signalQuality.total > 0 
              ? ((item.value / signalQuality.total) * 100).toFixed(1)
              : '0.0'
            return (
              <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`${item.color} w-full h-2 rounded mb-2`}></div>
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{percentage}%</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Body Position Comparison */}
      {bodyPositionStats.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Signal Strength by Body Position
          </h2>
          <div className="mb-4 text-sm text-gray-600">
            Showing {bodyPositionStats.length} positions: {bodyPositionStats.map(s => s.position).join(', ')}
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={bodyPositionStats} 
              margin={{ bottom: 80, left: 20, right: 20, top: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="position" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={120}
                interval={0}
              />
              <YAxis 
                label={{ value: 'RSSI (dBm)', angle: -90, position: 'insideLeft' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `${value} dBm`}
              />
              <Tooltip 
                formatter={(value: any) => [`${Number(value).toFixed(2)} dBm`, 'Mean RSSI']}
                labelFormatter={(label) => `Position: ${label}`}
              />
              <Bar dataKey="mean" name="Mean RSSI" radius={[8, 8, 0, 0]}>
                {bodyPositionStats.map((stat, index) => (
                  <Cell key={`cell-${index}`} fill={getPositionColor(stat.position)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Signal Quality by Position */}
      {rssiDistributionByPosition.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Signal Quality by Body Position</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={rssiDistributionByPosition}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="position" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="excellent" stackId="a" fill="#10b981" name="Excellent" />
              <Bar dataKey="good" stackId="a" fill="#3b82f6" name="Good" />
              <Bar dataKey="fair" stackId="a" fill="#f59e0b" name="Fair" />
              <Bar dataKey="poor" stackId="a" fill="#ef4444" name="Poor" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Radar Chart */}
      {radarData.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Position Performance Radar</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="position" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Performance" dataKey="Mean RSSI" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Radar name="Stability" dataKey="Stability" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Time Series */}
      {timeSeriesData.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Signal Strength Over Time</h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorRssi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'RSSI (dBm)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Area type="monotone" dataKey="rssi" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRssi)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Coverage Heatmap */}
      {hasLocation && locationData.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Coverage Heatmap</h2>
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="X Coordinate" />
              <YAxis type="number" dataKey="y" name="Y Coordinate" />
              <ZAxis type="number" dataKey="rssi" range={[60, 400]} name="RSSI" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Signal Strength" data={locationData} fill="#8884d8">
                {locationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.rssi! > -70 ? '#10b981' : 
                      entry.rssi! > -85 ? '#3b82f6' : 
                      entry.rssi! > -100 ? '#f59e0b' : '#ef4444'
                    }
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Coverage Summary Table */}
      {summary.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Coverage Summary</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cell ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mean RSSI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stability</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.cell_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.rssi_mean.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.rssi_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.stability_score.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
