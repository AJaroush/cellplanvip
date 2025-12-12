# Cellular Network Planning Dashboard

A modern React-based web application for visualizing and analyzing cellular network planning results. All visualizations are generated dynamically from data - no static images used.

## Features

- **Modern React UI** with Tailwind CSS
- **Dynamic Visualizations** using Recharts - all charts generated from data
- **Real-time Data Loading** from CSV/JSON files
- **Interactive Charts** - zoom, pan, hover for details
- **Multi-page Dashboard**:
  - Overview: Project summary and key statistics
  - User Analysis: Individual and aggregated user data
  - Tower Recommendations: Interactive tower placement maps
  - Visualizations: Comprehensive analysis charts

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

You need to run two servers:

1. **Data Server** (serves CSV/JSON files):
```bash
npm run server
```
This starts the Express server on port 3001

2. **React App** (in a new terminal):
```bash
npm run dev
```
This starts the Vite dev server on port 3000

Then open http://localhost:3000 in your browser.

## Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
cellular_network_dashboard/
├── src/
│   ├── pages/
│   │   ├── Overview.tsx
│   │   ├── UserAnalysis.tsx
│   │   ├── TowerRecommendations.tsx
│   │   └── Visualizations.tsx
│   ├── utils/
│   │   └── api.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server.js          # Express server for data API
├── package.json
└── vite.config.ts
```

## Data Requirements

The application expects data files in `../cellular_planning_results/`:
- `summary_statistics.json`
- `all_users_tower_recommendations.csv`
- `all_users_coverage_summary.csv`
- `cellular_merged_with_location.csv` or `all_users_combined.csv`
- User-specific folders (User1/, User2/, User3/) with `processed_data.csv` and `coverage_summary.csv`

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Chart library
- **Express** - Data API server
- **Axios** - HTTP client

## Notes

- All visualizations are generated dynamically from data
- No static images are used
- Data is loaded on-demand for performance
- Charts are fully interactive

