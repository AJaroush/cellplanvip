import { useEffect, useState } from 'react'
import { api, SignalData } from '../utils/api'
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
  PieChart,
  Pie,
  ComposedChart,
  Line,
} from 'recharts'

export default function Visualizations() {
  const [data, setData] = useState<SignalData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const signalData = await api.getData()
      setData(signalData)
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

  // Normalize and prepare data

  const bodyPositionData = data
    .filter(d => d.body_position && d.rssi !== undefined)
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
      const sorted = [...nums].sort((a: number, b: number) => a - b)
      return {
        position,
        icon: getPositionIcon(position),
        mean: nums.reduce((a: number, b: number) => a + b, 0) / nums.length,
        min: Math.min(...nums),
        max: Math.max(...nums),
        median: sorted[Math.floor(sorted.length / 2)],
        count: nums.length,
        q1: sorted[Math.floor(sorted.length * 0.25)],
        q3: sorted[Math.floor(sorted.length * 0.75)],
        order: positionOrder.indexOf(position) >= 0 ? positionOrder.indexOf(position) : 999,
      }
    })
    .filter((stat): stat is NonNullable<typeof stat> => stat !== null)
    .sort((a, b) => a.order - b.order) // Sort by preferred order

  // RSSI distribution bins
  const rssiBins = [-140, -120, -100, -80, -60, -40, -20, 0]
  const rssiDistribution = rssiBins.slice(0, -1).map((bin, idx) => {
    const nextBin = rssiBins[idx + 1]
    const count = data.filter(d => d.rssi !== undefined && d.rssi! >= bin && d.rssi! < nextBin).length
    return {
      range: `${bin} to ${nextBin}`,
      count,
      mid: (bin + nextBin) / 2,
    }
  })

  // Signal quality pie chart
  const signalQualityPie = [
    { name: 'Excellent (>-70)', value: data.filter(d => d.rssi !== undefined && d.rssi! > -70).length, fill: '#10b981' },
    { name: 'Good (-70 to -85)', value: data.filter(d => d.rssi !== undefined && d.rssi! > -85 && d.rssi! <= -70).length, fill: '#3b82f6' },
    { name: 'Fair (-85 to -100)', value: data.filter(d => d.rssi !== undefined && d.rssi! > -100 && d.rssi! <= -85).length, fill: '#f59e0b' },
    { name: 'Poor (<-100)', value: data.filter(d => d.rssi !== undefined && d.rssi! <= -100).length, fill: '#ef4444' },
  ].filter(item => item.value > 0)

  // Body position distribution
  const positionDistribution = bodyPositionStats.map(stat => ({
    name: `${stat.icon} ${stat.position}`,
    value: stat.count,
    fill: getPositionColor(stat.position),
  }))

  const hasLocation = data.some(d => d.x !== undefined && d.y !== undefined)
  const locationData = hasLocation
    ? data
        .filter(d => d.x !== undefined && d.y !== undefined && d.rssi !== undefined)
        .slice(0, 3000)
        .map(d => ({ 
          x: d.x, 
          y: d.y, 
          rssi: d.rssi,
          position: normalizePosition(d.body_position),
        }))
    : []

  // Time series data
  const timeSeriesData = data
    .filter(d => d.timestamp && d.rssi !== undefined)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .slice(0, 500)
    .map((d, idx) => ({ 
      time: idx, 
      rssi: d.rssi,
      position: normalizePosition(d.body_position),
    }))

  // Cell performance
  const cellPerformance = data
    .filter(d => d.cell_id && d.rssi !== undefined)
    .reduce((acc: any, d) => {
      if (!acc[d.cell_id!]) {
        acc[d.cell_id!] = []
      }
      acc[d.cell_id!].push(d.rssi!)
      return acc
    }, {})

  const cellStats = Object.entries(cellPerformance)
    .map(([cellId, values]: [string, any]) => {
      const nums = values.filter((v: number) => !isNaN(v))
      if (nums.length === 0) return null
      return {
        cellId: cellId.substring(0, 8) + '...',
        mean: nums.reduce((a: number, b: number) => a + b, 0) / nums.length,
        count: nums.length,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 20)

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Comprehensive Visualizations</h1>
        <p className="text-purple-100">Interactive analysis of cellular network signal data</p>
      </div>

      {/* Signal Quality Pie Chart */}
      {signalQualityPie.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Signal Quality Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={signalQualityPie}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {signalQualityPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center space-y-2">
              {signalQualityPie.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded`} style={{ backgroundColor: item.fill }}></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RSSI Distribution */}
      {rssiDistribution.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">RSSI Distribution by Range</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={rssiDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {rssiDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.mid > -70 ? '#10b981' :
                      entry.mid > -85 ? '#3b82f6' :
                      entry.mid > -100 ? '#f59e0b' : '#ef4444'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Body Position Comparison */}
      {bodyPositionStats.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Signal Strength by Body Position</h2>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={bodyPositionStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="position" angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: 'RSSI (dBm)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="max" fill="#10b981" name="Max" />
              <Bar dataKey="mean" fill="#3b82f6" name="Mean" />
              <Bar dataKey="min" fill="#ef4444" name="Min" />
              <Line type="monotone" dataKey="median" stroke="#8b5cf6" strokeWidth={2} name="Median" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Body Position Distribution */}
      {positionDistribution.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Distribution by Body Position</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={positionDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {positionDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
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
              <XAxis dataKey="time" label={{ value: 'Time Index', position: 'insideBottom', offset: -5 }} />
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

      {/* Top Cells Performance */}
      {cellStats.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 20 Cells by Usage</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={cellStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="cellId" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                {cellStats.map((entry: any, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.mean > -70 ? '#10b981' : entry.mean > -85 ? '#3b82f6' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data Summary */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{data.length.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">With RSSI</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.filter(d => d.rssi !== undefined).length.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">With Location</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.filter(d => d.x !== undefined && d.y !== undefined).length.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Body Positions</p>
            <p className="text-2xl font-bold text-gray-900">
              {new Set(data.filter(d => d.body_position).map(d => normalizePosition(d.body_position))).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
