import { useEffect, useState } from 'react'
import { api, TowerRecommendation, SignalData } from '../utils/api'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'

export default function TowerRecommendations() {
  const [towers, setTowers] = useState<TowerRecommendation[]>([])
  const [data, setData] = useState<SignalData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const towerData = await api.getTowers()
      setTowers(towerData)
      
      const signalData = await api.getData()
      setData(Array.isArray(signalData) ? signalData : [])
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

  const hasLocation = towers.some(t => t.x !== undefined && t.y !== undefined)
  const towerLocations = towers
    .filter(t => t.x !== undefined && t.y !== undefined)
    .map(t => ({ x: t.x!, y: t.y!, priority: t.priority || 'medium' }))

  const signalLocations = data
    .filter(d => d.x !== undefined && d.y !== undefined && d.rssi !== undefined)
    .slice(0, 2000)
    .map(d => ({ x: d.x!, y: d.y!, rssi: d.rssi! }))

  const priorityCounts = towers.reduce((acc: any, tower) => {
    const priority = tower.priority || 'medium'
    acc[priority] = (acc[priority] || 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(priorityCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  const totalTowers = towers.reduce((sum, t) => sum + (t.recommended_towers || 1), 0)

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Tower Placement Recommendations</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Recommended Towers</p>
          <p className="text-2xl font-bold text-gray-900">{towers.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Tower Count</p>
          <p className="text-2xl font-bold text-gray-900">{totalTowers}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-600">High Priority</p>
          <p className="text-2xl font-bold text-gray-900">{priorityCounts.high || 0}</p>
        </div>
      </div>

      {hasLocation && towerLocations.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tower Placement Map</h2>
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="X Coordinate" />
              <YAxis type="number" dataKey="y" name="Y Coordinate" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {signalLocations.length > 0 && (
                <Scatter name="Signal Strength" data={signalLocations} fill="#8884d8">
                  {signalLocations.map((entry, index) => (
                    <Cell
                      key={`signal-${index}`}
                      fill={entry.rssi > -80 ? '#10b981' : entry.rssi > -100 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Scatter>
              )}
              <Scatter name="Recommended Towers" data={towerLocations} fill="#ef4444" shape="triangle">
                {towerLocations.map((entry, index) => (
                  <Cell
                    key={`tower-${index}`}
                    fill={entry.priority === 'high' ? '#ef4444' : entry.priority === 'medium' ? '#f59e0b' : '#3b82f6'}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {pieData.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tower Priority Distribution</h2>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={['#ef4444', '#f59e0b', '#3b82f6'][index % 3]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tower Recommendations</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cluster ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Signal (dBm)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Towers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {towers.slice(0, 20).map((tower, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tower.cluster_id || idx}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tower.avg_signal_dbm?.toFixed(2) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tower.recommended_towers || 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        tower.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : tower.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {tower.priority || 'medium'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

