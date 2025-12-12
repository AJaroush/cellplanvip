import { useState, useEffect, useRef } from 'react'
import { Play, Square, Download, Home } from 'lucide-react'
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

interface Measurement {
  id: string
  x: number
  y: number
  rssi: number
  timestamp: number
  room?: string
}

export default function IndoorMapper() {
  const [isRecording, setIsRecording] = useState(false)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 })
  const [currentRssi, setCurrentRssi] = useState<number | null>(null)
  const [roomName, setRoomName] = useState('')
  const [rooms, setRooms] = useState<string[]>([])
  const intervalRef = useRef<number | null>(null)
  const positionRef = useRef({ x: 0, y: 0, angle: 0 })

  // Simulate walking and collecting data
  useEffect(() => {
    if (isRecording) {
      // Simulate phone movement (in real app, this would use device sensors)
      intervalRef.current = window.setInterval(() => {
        // Simulate walking in a pattern
        const speed = 0.1 // units per second
        const angle = positionRef.current.angle + (Math.random() - 0.5) * 0.3
        
        positionRef.current.angle = angle
        positionRef.current.x += Math.cos(angle) * speed
        positionRef.current.y += Math.sin(angle) * speed

        // Simulate RSSI variation (in real app, get from device)
        const baseRssi = -85
        const variation = (Math.random() - 0.5) * 10
        const rssi = baseRssi + variation

        setCurrentPosition({ x: positionRef.current.x, y: positionRef.current.y })
        setCurrentRssi(rssi)

        // Record measurement
        const measurement: Measurement = {
          id: Date.now().toString(),
          x: positionRef.current.x,
          y: positionRef.current.y,
          rssi,
          timestamp: Date.now(),
          room: roomName || undefined
        }

        setMeasurements(prev => [...prev, measurement])
      }, 500) // Record every 500ms
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [isRecording, roomName])

  // Get unique rooms
  useEffect(() => {
    const uniqueRooms = Array.from(new Set(measurements.map(m => m.room).filter(Boolean)))
    setRooms(uniqueRooms as string[])
  }, [measurements])

  // Coverage statistics
  const stats = {
    total: measurements.length,
    excellent: measurements.filter(m => m.rssi > -70).length,
    good: measurements.filter(m => m.rssi > -85 && m.rssi <= -70).length,
    fair: measurements.filter(m => m.rssi > -100 && m.rssi <= -85).length,
    poor: measurements.filter(m => m.rssi <= -100).length,
    avgRssi: measurements.length > 0 
      ? measurements.reduce((sum, m) => sum + m.rssi, 0) / measurements.length 
      : 0
  }

  // Coverage grid for heatmap
  const coverageGrid = (() => {
    if (measurements.length === 0) return []
    
    const gridSize = 0.5
    const grid: Map<string, { x: number, y: number, rssis: number[], count: number }> = new Map()

    measurements.forEach(m => {
      const gridX = Math.floor(m.x / gridSize) * gridSize
      const gridY = Math.floor(m.y / gridSize) * gridSize
      const key = `${gridX},${gridY}`
      
      if (!grid.has(key)) {
        grid.set(key, { x: gridX, y: gridY, rssis: [], count: 0 })
      }
      grid.get(key)!.rssis.push(m.rssi)
      grid.get(key)!.count++
    })

    return Array.from(grid.values()).map(cell => ({
      x: cell.x,
      y: cell.y,
      avgRssi: cell.rssis.reduce((a, b) => a + b, 0) / cell.rssis.length,
      count: cell.count
    }))
  })()

  const handleStart = () => {
    setIsRecording(true)
    positionRef.current = { x: 0, y: 0, angle: 0 }
  }

  const handleStop = () => {
    setIsRecording(false)
  }

  const handleClear = () => {
    setMeasurements([])
    setCurrentPosition({ x: 0, y: 0 })
    setCurrentRssi(null)
    setRooms([])
  }

  const handleExport = () => {
    const data = {
      measurements,
      stats,
      timestamp: Date.now()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `indoor-signal-map-${Date.now()}.json`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">📱 Indoor Signal Mapper</h1>
        <p className="text-blue-100">Walk around your house and map signal strength in real-time</p>
      </div>

      {/* Mobile Interface Simulation */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Home className="w-5 h-5 mr-2 text-blue-500" />
            Mobile Mapper Interface
          </h2>

          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Current Position</span>
              <span className="text-sm font-mono text-gray-900">
                ({currentPosition.x.toFixed(2)}, {currentPosition.y.toFixed(2)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Signal Strength</span>
              <span className={`text-lg font-bold ${
                currentRssi && currentRssi > -70 ? 'text-green-600' :
                currentRssi && currentRssi > -85 ? 'text-blue-600' :
                currentRssi && currentRssi > -100 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {currentRssi ? `${currentRssi.toFixed(1)} dBm` : '--'}
              </span>
            </div>
          </div>

          {/* Room Label */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Room (optional)
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Living Room, Bedroom"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Controls */}
          <div className="flex space-x-3">
            {!isRecording ? (
              <button
                onClick={handleStart}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Mapping
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </button>
            )}
            <button
              onClick={handleClear}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            >
              Clear
            </button>
          </div>

          {isRecording && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                🚶 Walk around your house. The app is recording signal strength at your current location.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {measurements.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Measurements</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Avg RSSI</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgRssi.toFixed(1)} dBm</p>
          </div>
          <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Good Coverage</p>
            <p className="text-2xl font-bold text-gray-900">
              {((stats.excellent + stats.good) / stats.total * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white shadow-lg rounded-lg p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Rooms Mapped</p>
            <p className="text-2xl font-bold text-gray-900">{rooms.length}</p>
          </div>
        </div>
      )}

      {/* Signal Quality Breakdown */}
      {measurements.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Signal Quality Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Excellent (>-70)', value: stats.excellent, color: 'bg-green-500' },
              { label: 'Good (-70 to -85)', value: stats.good, color: 'bg-blue-500' },
              { label: 'Fair (-85 to -100)', value: stats.fair, color: 'bg-yellow-500' },
              { label: 'Poor (<-100)', value: stats.poor, color: 'bg-red-500' },
            ].map((item, idx) => (
              <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`${item.color} w-full h-2 rounded mb-2`}></div>
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500">
                  {((item.value / stats.total) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Heatmap Generator */}
      {measurements.length > 0 && !isRecording && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Final Heatmap Generated</h2>
              <p className="text-gray-600">Complete coverage visualization of your indoor mapping session</p>
            </div>
            <button
              onClick={handleExport}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-semibold"
            >
              <Download className="w-5 h-5 mr-2" />
              Export Heatmap Data
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-gray-900">{measurements.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Coverage Area</p>
                <p className="text-2xl font-bold text-gray-900">
                  {coverageGrid.length} cells
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Signal</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgRssi.toFixed(1)} dBm</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quality Score</p>
                <p className="text-2xl font-bold text-green-600">
                  {((stats.excellent + stats.good) / stats.total * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coverage Heatmap */}
      {measurements.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {!isRecording ? '📈 Generated Heatmap Visualization' : 'Indoor Coverage Heatmap (Live)'}
            </h2>
            {!isRecording && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="X (meters)" 
                label={{ value: 'Position X', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Y (meters)" 
                label={{ value: 'Position Y', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any, name: string) => {
                  if (name === 'avgRssi') return [`${value.toFixed(2)} dBm`, 'Avg RSSI']
                  return [value, name]
                }}
              />
              
              {/* Coverage grid */}
              {coverageGrid.length > 0 && (
                <Scatter name="Coverage Grid" data={coverageGrid} fill="#8884d8">
                  {coverageGrid.map((cell, index) => (
                    <Cell
                      key={`grid-${index}`}
                      fill={
                        cell.avgRssi > -70 ? '#10b981' :
                        cell.avgRssi > -85 ? '#3b82f6' :
                        cell.avgRssi > -100 ? '#f59e0b' : '#ef4444'
                      }
                    />
                  ))}
                </Scatter>
              )}

              {/* Individual measurements */}
              <Scatter name="Measurements" data={measurements} fill="#8884d8">
                {measurements.map((m, index) => (
                  <Cell
                    key={`point-${index}`}
                    fill={
                      m.rssi > -70 ? '#10b981' :
                      m.rssi > -85 ? '#3b82f6' :
                      m.rssi > -100 ? '#f59e0b' : '#ef4444'
                    }
                  />
                ))}
              </Scatter>

              {/* Current position */}
              {isRecording && currentRssi !== null && (
                <Scatter name="Current Position" data={[{ x: currentPosition.x, y: currentPosition.y, rssi: currentRssi }]}>
                  <Cell fill="#000000" />
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Room Analysis */}
      {rooms.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Room-by-Room Analysis</h2>
          <div className="space-y-4">
            {rooms.map(room => {
              const roomMeasurements = measurements.filter(m => m.room === room)
              const roomAvgRssi = roomMeasurements.length > 0
                ? roomMeasurements.reduce((sum, m) => sum + m.rssi, 0) / roomMeasurements.length
                : 0
              const roomQuality = roomAvgRssi > -70 ? 'excellent' :
                                 roomAvgRssi > -85 ? 'good' :
                                 roomAvgRssi > -100 ? 'fair' : 'poor'
              
              return (
                <div key={room} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{room}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      roomQuality === 'excellent' ? 'bg-green-100 text-green-800' :
                      roomQuality === 'good' ? 'bg-blue-100 text-blue-800' :
                      roomQuality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {roomQuality}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>{roomMeasurements.length} measurements</span>
                    <span className="font-semibold text-gray-900">{roomAvgRssi.toFixed(1)} dBm</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Click "Start Mapping" to begin recording</li>
          <li>Walk around your house while holding your phone</li>
          <li>Optionally label rooms as you enter them</li>
          <li>The app records signal strength at your current location</li>
          <li>View the heatmap to see coverage patterns</li>
          <li>Export data for further analysis</li>
        </ol>
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This is a web-based simulation. A real mobile app would use:
            GPS/indoor positioning, device signal strength APIs, and motion sensors for accurate tracking.
          </p>
        </div>
      </div>
    </div>
  )
}

