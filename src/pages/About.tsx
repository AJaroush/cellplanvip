import { GraduationCap, User, Heart } from 'lucide-react'

export default function About() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">About This Project</h1>
        <p className="text-blue-100">Cellular Network Planning Dashboard</p>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Project Information</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              This comprehensive cellular network planning dashboard was developed as part of the 
              MOBiSENSE project, focusing on data-driven analysis of signal strength, coverage gaps, 
              and network optimization strategies.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <User className="w-6 h-6 mr-2 text-blue-600" />
              Developer
            </h3>
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-lg font-semibold text-gray-900 mb-2">Ahmad Jaroush</p>
              <p className="text-gray-600">Primary Developer & Researcher</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <GraduationCap className="w-6 h-6 mr-2 text-purple-600" />
              Academic Supervisor
            </h3>
            <div className="bg-purple-50 rounded-lg p-6">
              <p className="text-lg font-semibold text-gray-900 mb-2">Dr. Hadi Sarieddeen</p>
              <p className="text-gray-600">Supervisor & Research Advisor</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Project Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Signal Analysis</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>RSSI distribution analysis</li>
                  <li>Body position impact studies</li>
                  <li>Signal quality categorization</li>
                  <li>Temporal signal patterns</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Network Planning</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Coverage gap identification</li>
                  <li>Tower placement recommendations</li>
                  <li>Cell performance analysis</li>
                  <li>Priority-based optimization</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Visualizations</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Interactive heatmaps</li>
                  <li>Time series analysis</li>
                  <li>Statistical distributions</li>
                  <li>Comparative charts</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Tools</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Indoor signal mapper</li>
                  <li>Local network planner</li>
                  <li>WiFi analyzer</li>
                  <li>Real-time monitoring</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Technology Stack</h3>
            <div className="flex flex-wrap gap-2">
              {['React', 'TypeScript', 'Express.js', 'Recharts', 'Tailwind CSS', 'Node.js'].map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 text-center">
            <p className="text-gray-600 flex items-center justify-center">
              <Heart className="w-5 h-5 mr-2 text-red-500" />
              Developed with dedication for cellular network research and optimization
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

