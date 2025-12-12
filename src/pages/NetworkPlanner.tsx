import { useState, useMemo, useEffect } from 'react'
import { api, SignalData } from '../utils/api'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Radio, Target, Zap, TrendingUp } from 'lucide-react'

interface CoverageGap {
  x: number
  y: number
  avgRssi: number
  count: number
  priority: 'high' | 'medium' | 'low'
}

export default function NetworkPlanner() {
  const [data, setData] = useState<SignalData[]>([])
  const [loading, setLoading] = useState(true)
  const [towerCount, setTowerCount] = useState(5)
  const [coverageThreshold, setCoverageThreshold] = useState(-85)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'kmeans' | 'coverage' | 'density'>('coverage')

  // Load data
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

  // Analyze coverage gaps
  const coverageGaps = useMemo(() => {
    if (!data.length) return []
    
    const locationData = data
      .filter(d => d.x !== undefined && d.y !== undefined && d.rssi !== undefined && d.rssi < 0)
      .map(d => ({ x: d.x!, y: d.y!, rssi: d.rssi! }))

    if (locationData.length === 0) return []

    // Create grid cells for analysis
    const gridSize = 2.0
    const grid: Map<string, { rssis: number[], x: number, y: number, count: number }> = new Map()

    locationData.forEach(point => {
      const gridX = Math.floor(point.x / gridSize) * gridSize
      const gridY = Math.floor(point.y / gridSize) * gridSize
      const gridKey = `${gridX},${gridY}`
      
      if (!grid.has(gridKey)) {
        grid.set(gridKey, { rssis: [], x: gridX, y: gridY, count: 0 })
      }
      const cell = grid.get(gridKey)!
      cell.rssis.push(point.rssi)
      cell.count++
    })

    // Identify weak coverage areas
    const gaps: CoverageGap[] = []
    grid.forEach((cell) => {
      const avgRssi = cell.rssis.reduce((a, b) => a + b, 0) / cell.rssis.length
      if (avgRssi < coverageThreshold) {
        gaps.push({
          x: cell.x,
          y: cell.y,
          avgRssi,
          count: cell.count,
          priority: avgRssi < -100 ? 'high' : avgRssi < -90 ? 'medium' : 'low'
        })
      }
    })

    return gaps.sort((a, b) => b.count - a.count)
  }, [data, coverageThreshold])

  // Generate tower recommendations
  const towerRecommendations = useMemo(() => {
    if (coverageGaps.length === 0) return []

    if (selectedAlgorithm === 'kmeans') {
      // K-means clustering approach
      const k = Math.min(towerCount, coverageGaps.length)
      const centroids: { x: number, y: number }[] = []
      
      // Initialize centroids with highest priority gaps
      const sortedGaps = [...coverageGaps].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      
      for (let i = 0; i < k; i++) {
        centroids.push({ x: sortedGaps[i].x, y: sortedGaps[i].y })
      }

      // Simple k-means iteration
      for (let iter = 0; iter < 10; iter++) {
        const clusters: CoverageGap[][] = Array(k).fill(null).map(() => [])
        
        coverageGaps.forEach(gap => {
          let minDist = Infinity
          let closest = 0
          centroids.forEach((centroid, idx) => {
            const dist = Math.sqrt(
              Math.pow(gap.x - centroid.x, 2) + Math.pow(gap.y - centroid.y, 2)
            )
            if (dist < minDist) {
              minDist = dist
              closest = idx
            }
          })
          clusters[closest].push(gap)
        })

        // Update centroids
        centroids.forEach((centroid, idx) => {
          if (clusters[idx].length > 0) {
            centroid.x = clusters[idx].reduce((sum, g) => sum + g.x, 0) / clusters[idx].length
            centroid.y = clusters[idx].reduce((sum, g) => sum + g.y, 0) / clusters[idx].length
          }
        })
      }

      return centroids.map((centroid, idx) => ({
        id: idx + 1,
        x: centroid.x,
        y: centroid.y,
        priority: coverageGaps.find(g => 
          Math.abs(g.x - centroid.x) < 1 && Math.abs(g.y - centroid.y) < 1
        )?.priority || 'medium',
        estimatedCoverage: Math.min(100, coverageGaps.filter(g => {
          const dist = Math.sqrt(
            Math.pow(g.x - centroid.x, 2) + Math.pow(g.y - centroid.y, 2)
          )
          return dist < 5 // 5 unit radius
        }).length * 10)
      }))
    } else if (selectedAlgorithm === 'density') {
      // Density-based approach - place towers in highest density weak areas
      const sortedGaps = [...coverageGaps]
        .sort((a, b) => b.count - a.count)
        .slice(0, towerCount)
      
      return sortedGaps.map((gap, idx) => ({
        id: idx + 1,
        x: gap.x,
        y: gap.y,
        priority: gap.priority,
        estimatedCoverage: Math.min(100, gap.count * 2)
      }))
    } else {
      // Coverage-based - maximize coverage of weak areas
      const towers: any[] = []
      const covered = new Set<string>()
      
      const sortedGaps = [...coverageGaps].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

      for (let i = 0; i < Math.min(towerCount, sortedGaps.length); i++) {
        const gap = sortedGaps[i]
        const key = `${gap.x},${gap.y}`
        
        if (!covered.has(key)) {
          towers.push({
            id: towers.length + 1,
            x: gap.x,
            y: gap.y,
            priority: gap.priority,
            estimatedCoverage: Math.min(100, gap.count * 3)
          })
          
          // Mark nearby gaps as covered
          coverageGaps.forEach(g => {
            const dist = Math.sqrt(
              Math.pow(g.x - gap.x, 2) + Math.pow(g.y - gap.y, 2)
            )
            if (dist < 4) {
              covered.add(`${g.x},${g.y}`)
            }
          })
        }
      }

      return towers
    }
  }, [coverageGaps, towerCount, selectedAlgorithm])

  // Calculate coverage improvement
  const coverageStats = useMemo(() => {
    const totalPoints = data.filter(d => d.x !== undefined && d.y !== undefined && d.rssi !== undefined).length
    const weakPoints = data.filter(d => 
      d.x !== undefined && d.y !== undefined && 
      d.rssi !== undefined && d.rssi < coverageThreshold
    ).length
    
    // Estimate improvement with towers
    const estimatedCovered = towerRecommendations.reduce((sum, tower) => sum + tower.estimatedCoverage, 0)
    const improvement = Math.min(100, (estimatedCovered / Math.max(1, weakPoints)) * 100)
    
    return {
      totalPoints,
      weakPoints,
      weakPercentage: totalPoints > 0 ? (weakPoints / totalPoints * 100).toFixed(1) : '0',
      estimatedImprovement: improvement.toFixed(1),
      currentCoverage: totalPoints > 0 ? ((totalPoints - weakPoints) / totalPoints * 100).toFixed(1) : '0',
      projectedCoverage: totalPoints > 0 ? 
        Math.min(100, ((totalPoints - weakPoints + estimatedCovered) / totalPoints * 100)).toFixed(1) : '0'
    }
  }, [data, coverageThreshold, towerRecommendations])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const locationData = data
    .filter(d => d.x !== undefined && d.y !== undefined && d.rssi !== undefined && d.rssi < 0)
    .slice(0, 3000)
    .map(d => ({ x: d.x!, y: d.y!, rssi: d.rssi! }))

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Interactive Network Planner</h1>
        <p className="text-indigo-100">Design optimal cellular tower placement for any location</p>
      </div>

      {/* Controls */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Planning Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Towers
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={towerCount}
              onChange={(e) => setTowerCount(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center mt-2">
              <span className="text-2xl font-bold text-primary-600">{towerCount}</span>
              <span className="text-sm text-gray-600 ml-2">towers</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coverage Threshold (dBm)
            </label>
            <input
              type="range"
              min="-120"
              max="-60"
              step="5"
              value={coverageThreshold}
              onChange={(e) => setCoverageThreshold(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center mt-2">
              <span className="text-2xl font-bold text-primary-600">{coverageThreshold}</span>
              <span className="text-sm text-gray-600 ml-2">dBm</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placement Algorithm
            </label>
            <select
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="coverage">Coverage-Based</option>
              <option value="density">Density-Based</option>
              <option value="kmeans">K-Means Clustering</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedAlgorithm === 'coverage' && 'Maximizes coverage of weak areas'}
              {selectedAlgorithm === 'density' && 'Places towers in highest density weak zones'}
              {selectedAlgorithm === 'kmeans' && 'Uses clustering to find optimal positions'}
            </p>
          </div>
        </div>
      </div>

      {/* Coverage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Coverage</p>
              <p className="text-2xl font-bold text-gray-900">{coverageStats.currentCoverage}%</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weak Coverage Areas</p>
              <p className="text-2xl font-bold text-gray-900">{coverageStats.weakPercentage}%</p>
            </div>
            <Zap className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Projected Coverage</p>
              <p className="text-2xl font-bold text-gray-900">{coverageStats.projectedCoverage}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Improvement</p>
              <p className="text-2xl font-bold text-gray-900">+{coverageStats.estimatedImprovement}%</p>
            </div>
            <Radio className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Coverage Map with Towers */}
      {locationData.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Coverage Map & Tower Placement</h2>
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="X Coordinate" />
              <YAxis type="number" dataKey="y" name="Y Coordinate" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              
              {/* Signal strength points */}
              <Scatter name="Signal Strength" data={locationData} fill="#8884d8">
                {locationData.map((entry, index) => (
                  <Cell
                    key={`signal-${index}`}
                    fill={
                      entry.rssi > -70 ? '#10b981' :
                      entry.rssi > -85 ? '#3b82f6' :
                      entry.rssi > -100 ? '#f59e0b' : '#ef4444'
                    }
                  />
                ))}
              </Scatter>

              {/* Coverage gaps */}
              {coverageGaps.length > 0 && (
                <Scatter name="Coverage Gaps" data={coverageGaps} fill="#f59e0b">
                  {coverageGaps.map((gap, index) => (
                    <Cell
                      key={`gap-${index}`}
                      fill={
                        gap.priority === 'high' ? '#ef4444' :
                        gap.priority === 'medium' ? '#f59e0b' : '#fbbf24'
                      }
                    />
                  ))}
                </Scatter>
              )}

              {/* Recommended towers */}
              {towerRecommendations.length > 0 && (
                <Scatter name="Recommended Towers" data={towerRecommendations} fill="#000000" shape="triangle">
                  {towerRecommendations.map((tower, index) => (
                    <Cell
                      key={`tower-${index}`}
                      fill={
                        tower.priority === 'high' ? '#dc2626' :
                        tower.priority === 'medium' ? '#f59e0b' : '#3b82f6'
                      }
                    />
                  ))}
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tower Recommendations Table */}
      {towerRecommendations.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tower Recommendations</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tower ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">X Coordinate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Y Coordinate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Coverage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {towerRecommendations.map((tower) => (
                  <tr key={tower.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Tower {tower.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tower.x.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tower.y.toFixed(2)}
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
                        {tower.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tower.estimatedCoverage.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Algorithm Comparison */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Algorithm Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['coverage', 'density', 'kmeans'].map((algo) => {
            const isActive = selectedAlgorithm === algo
            return (
              <button
                key={algo}
                onClick={() => setSelectedAlgorithm(algo as any)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-gray-900 capitalize mb-2">{algo.replace('-', ' ')}</h3>
                <p className="text-sm text-gray-600">
                  {algo === 'coverage' && 'Maximizes coverage of weak signal areas'}
                  {algo === 'density' && 'Places towers in highest density weak zones'}
                  {algo === 'kmeans' && 'Uses machine learning clustering for optimal placement'}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

