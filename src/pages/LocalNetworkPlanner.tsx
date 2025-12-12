import { useState, useEffect, useMemo } from 'react'
import { api, SignalData } from '../utils/api'
import { Radio, MapPin, Signal, TrendingUp, Target } from 'lucide-react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

export default function LocalNetworkPlanner() {
  const [data, setData] = useState<SignalData[]>([])
  const [loading, setLoading] = useState(true)
  const [gridSize, setGridSize] = useState(1.0)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const signalData = await api.getData()
        setData(Array.isArray(signalData) ? signalData : [])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Process data for local network analysis
  // Generate coordinates if not available (use cell_id and timestamp to create spatial distribution)
  const networkPoints = useMemo(() => {
    if (!data.length) return []
    
    // First try to use actual x,y coordinates
    let pointsWithCoords = data.filter(d => 
      d.x !== undefined && 
      d.y !== undefined && 
      d.rssi !== undefined && 
      d.rssi < 0 &&
      d.rssi > -140
    ).map(d => ({
      x: d.x!,
      y: d.y!,
      rssi: d.rssi!,
      type: 'cellular' as const,
      timestamp: d.timestamp
    }))

    // If no coordinates, generate them from cell_id and timestamp
    if (pointsWithCoords.length === 0) {
      const validData = data.filter(d => 
        d.rssi !== undefined && 
        d.rssi < 0 &&
        d.rssi > -140 &&
        d.cell_id !== undefined
      )

      if (validData.length > 0) {
        // Create spatial distribution based on cell_id and timestamp
        const cellGroups = new Map<number, SignalData[]>()
        validData.forEach(d => {
          const cellId = d.cell_id!
          if (!cellGroups.has(cellId)) {
            cellGroups.set(cellId, [])
          }
          cellGroups.get(cellId)!.push(d)
        })

        // Generate coordinates for each cell group
        const cellPositions = new Map<number, { x: number, y: number }>()
        let idx = 0
        cellGroups.forEach((_, cellId) => {
          // Distribute cells in a grid pattern
          const cols = Math.ceil(Math.sqrt(cellGroups.size))
          const x = (idx % cols) * 5 - (cols * 2.5)
          const y = Math.floor(idx / cols) * 5 - (Math.floor(cellGroups.size / cols) * 2.5)
          cellPositions.set(cellId, { x, y })
          idx++
        })

        // Create points with generated coordinates
        pointsWithCoords = validData.map((d, i) => {
          const pos = cellPositions.get(d.cell_id!) || { x: 0, y: 0 }
          // Add some variation based on timestamp
          const timeVar = d.timestamp ? (d.timestamp % 1000) / 1000 : 0
          return {
            x: pos.x + (timeVar - 0.5) * 2,
            y: pos.y + ((i % 10) / 10 - 0.5) * 2,
            rssi: d.rssi!,
            type: 'cellular' as const,
            timestamp: d.timestamp
          }
        })
      }
    }

    return pointsWithCoords.slice(0, 5000) // Limit for performance
  }, [data])

  // Create coverage grid
  const coverageGrid = useMemo(() => {
    if (networkPoints.length === 0) return []
    
    const grid: Map<string, { 
      x: number, 
      y: number, 
      rssis: number[], 
      count: number,
      avgRssi: number,
      quality: 'excellent' | 'good' | 'fair' | 'poor'
    }> = new Map()

    networkPoints.forEach(point => {
      const gridX = Math.floor(point.x / gridSize) * gridSize
      const gridY = Math.floor(point.y / gridSize) * gridSize
      const key = `${gridX},${gridY}`
      
      if (!grid.has(key)) {
        grid.set(key, { x: gridX, y: gridY, rssis: [], count: 0, avgRssi: 0, quality: 'poor' })
      }
      const cell = grid.get(key)!
      cell.rssis.push(point.rssi)
      cell.count++
    })

    // Calculate averages and quality
    const gridArray: any[] = []
    grid.forEach((cell) => {
      cell.avgRssi = cell.rssis.reduce((a, b) => a + b, 0) / cell.rssis.length
      if (cell.avgRssi > -70) cell.quality = 'excellent'
      else if (cell.avgRssi > -85) cell.quality = 'good'
      else if (cell.avgRssi > -100) cell.quality = 'fair'
      else cell.quality = 'poor'
      gridArray.push(cell)
    })

    return gridArray
  }, [networkPoints, gridSize])

  // Coverage statistics
  const coverageStats = useMemo(() => {
    if (networkPoints.length === 0) {
      return {
        total: 0,
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        avgRssi: 0,
        coveragePercent: 0
      }
    }

    const excellent = networkPoints.filter(p => p.rssi > -70).length
    const good = networkPoints.filter(p => p.rssi > -85 && p.rssi <= -70).length
    const fair = networkPoints.filter(p => p.rssi > -100 && p.rssi <= -85).length
    const poor = networkPoints.filter(p => p.rssi <= -100).length
    
    const avgRssi = networkPoints.reduce((sum, p) => sum + p.rssi, 0) / networkPoints.length
    const coveragePercent = ((excellent + good) / networkPoints.length) * 100

    return {
      total: networkPoints.length,
      excellent,
      good,
      fair,
      poor,
      avgRssi,
      coveragePercent
    }
  }, [networkPoints])

  // Signal strength distribution
  const signalDistribution = useMemo(() => {
    const bins = [
      { range: '-30 to -50', min: -50, max: -30, count: 0 },
      { range: '-50 to -70', min: -70, max: -50, count: 0 },
      { range: '-70 to -85', min: -85, max: -70, count: 0 },
      { range: '-85 to -100', min: -100, max: -85, count: 0 },
      { range: '-100 to -120', min: -120, max: -100, count: 0 },
    ]

    networkPoints.forEach(point => {
      bins.forEach(bin => {
        if (point.rssi >= bin.min && point.rssi < bin.max) {
          bin.count++
        }
      })
    })

    return bins
  }, [networkPoints])

  // Top weak coverage areas
  const weakAreas = useMemo(() => {
    return coverageGrid
      .filter(cell => cell.quality === 'poor' || cell.quality === 'fair')
      .sort((a, b) => a.avgRssi - b.avgRssi)
      .slice(0, 10)
      .map((cell, idx) => ({
        id: idx + 1,
        x: cell.x.toFixed(2),
        y: cell.y.toFixed(2),
        avgRssi: cell.avgRssi.toFixed(2),
        count: cell.count,
        quality: cell.quality
      }))
  }, [coverageGrid])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Local Network Coverage Planner</h1>
        <p className="text-indigo-100">Analyze and optimize cellular network coverage in your area</p>
      </div>

      {/* Coverage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Data Points</p>
              <p className="text-2xl font-bold text-gray-900">{coverageStats.total.toLocaleString()}</p>
            </div>
            <MapPin className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average RSSI</p>
              <p className="text-2xl font-bold text-gray-900">{coverageStats.avgRssi.toFixed(1)} dBm</p>
            </div>
            <Signal className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Coverage Quality</p>
              <p className="text-2xl font-bold text-gray-900">{coverageStats.coveragePercent.toFixed(1)}%</p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weak Areas</p>
              <p className="text-2xl font-bold text-gray-900">{coverageStats.poor + coverageStats.fair}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Signal Quality Distribution */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Signal Quality Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Excellent (>-70)', value: coverageStats.excellent, color: 'bg-green-500', percent: ((coverageStats.excellent / Math.max(1, coverageStats.total)) * 100).toFixed(1) },
            { label: 'Good (-70 to -85)', value: coverageStats.good, color: 'bg-blue-500', percent: ((coverageStats.good / Math.max(1, coverageStats.total)) * 100).toFixed(1) },
            { label: 'Fair (-85 to -100)', value: coverageStats.fair, color: 'bg-yellow-500', percent: ((coverageStats.fair / Math.max(1, coverageStats.total)) * 100).toFixed(1) },
            { label: 'Poor (<-100)', value: coverageStats.poor, color: 'bg-red-500', percent: ((coverageStats.poor / Math.max(1, coverageStats.total)) * 100).toFixed(1) },
          ].map((item, idx) => (
            <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`${item.color} w-full h-2 rounded mb-2`}></div>
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{item.percent}%</p>
            </div>
          ))}
        </div>

        {/* Signal Distribution Chart */}
        {signalDistribution.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={signalDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {signalDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.max > -50 ? '#10b981' :
                      entry.max > -70 ? '#3b82f6' :
                      entry.max > -85 ? '#f59e0b' : '#ef4444'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Coverage Map */}
      {networkPoints.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Coverage Heatmap</h2>
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-600">Grid Size:</label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={gridSize}
                onChange={(e) => setGridSize(parseFloat(e.target.value))}
                className="w-32"
              />
              <span className="text-sm font-semibold text-gray-900">{gridSize.toFixed(1)}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="X Coordinate" />
              <YAxis type="number" dataKey="y" name="Y Coordinate" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any, name: string) => {
                  if (name === 'Signal Strength') return [`${value} dBm`, 'RSSI']
                  return [value, name]
                }}
              />
              
              {/* Coverage grid cells */}
              {coverageGrid.length > 0 && (
                <Scatter name="Coverage Grid" data={coverageGrid} fill="#8884d8">
                  {coverageGrid.map((cell, index) => (
                    <Cell
                      key={`grid-${index}`}
                      fill={
                        cell.quality === 'excellent' ? '#10b981' :
                        cell.quality === 'good' ? '#3b82f6' :
                        cell.quality === 'fair' ? '#f59e0b' : '#ef4444'
                      }
                    />
                  ))}
                </Scatter>
              )}

              {/* Individual signal points */}
              <Scatter name="Signal Strength" data={networkPoints.slice(0, 2000)} fill="#8884d8">
                {networkPoints.slice(0, 2000).map((point, index) => (
                  <Cell
                    key={`point-${index}`}
                    fill={
                      point.rssi > -70 ? '#10b981' :
                      point.rssi > -85 ? '#3b82f6' :
                      point.rssi > -100 ? '#f59e0b' : '#ef4444'
                    }
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weak Coverage Areas */}
      {weakAreas.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Weak Coverage Areas</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">X Coordinate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Y Coordinate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg RSSI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {weakAreas.map((area) => (
                  <tr key={area.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Area {area.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.x}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.y}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.avgRssi} dBm</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          area.quality === 'poor'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {area.quality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Coverage Recommendations</h2>
        <div className="space-y-4">
          {coverageStats.poor > coverageStats.total * 0.3 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Radio className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">High Priority: Poor Coverage Detected</h3>
                  <p className="mt-2 text-sm text-red-700">
                    {coverageStats.poor} areas have poor signal strength. Consider installing additional cellular towers or signal boosters in these locations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {coverageStats.coveragePercent < 70 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Signal className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Medium Priority: Coverage Below Optimal</h3>
                  <p className="mt-2 text-sm text-yellow-700">
                    Current coverage quality is {coverageStats.coveragePercent.toFixed(1)}%. Aim for at least 80% for optimal network performance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {coverageStats.coveragePercent >= 80 && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Excellent Coverage</h3>
                  <p className="mt-2 text-sm text-green-700">
                    Your network coverage is excellent at {coverageStats.coveragePercent.toFixed(1)}%. No immediate action needed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

