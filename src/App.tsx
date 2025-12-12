import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { BarChart3, Users, Radio, TrendingUp, Wifi, MapPin, Smartphone, Info } from 'lucide-react'
import Overview from './pages/Overview'
import UserAnalysis from './pages/UserAnalysis'
import TowerRecommendations from './pages/TowerRecommendations'
import Visualizations from './pages/Visualizations'
import WiFiAnalyzer from './pages/WiFiAnalyzer'
import LocalNetworkPlanner from './pages/LocalNetworkPlanner'
import IndoorMapper from './pages/IndoorMapper'
import About from './pages/About'

function Navigation() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Overview', icon: BarChart3 },
    { path: '/users', label: 'Signal Analysis', icon: Users },
    { path: '/wifi', label: 'WiFi Analyzer', icon: Wifi },
    { path: '/indoor', label: 'Indoor Mapper', icon: Smartphone },
    { path: '/local', label: 'Local Network Planner', icon: MapPin },
    { path: '/towers', label: 'Tower Recommendations', icon: Radio },
    { path: '/visualizations', label: 'Visualizations', icon: TrendingUp },
    { path: '/about', label: 'About', icon: Info },
  ]

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-primary-600">📡</span>
              <span className="ml-2 text-xl font-semibold text-gray-900">Cellular Network Planning</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/users" element={<UserAnalysis />} />
            <Route path="/wifi" element={<WiFiAnalyzer />} />
            <Route path="/indoor" element={<IndoorMapper />} />
            <Route path="/local" element={<LocalNetworkPlanner />} />
            <Route path="/towers" element={<TowerRecommendations />} />
            <Route path="/visualizations" element={<Visualizations />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

