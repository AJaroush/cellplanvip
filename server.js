import express from 'express';
import cors from 'cors';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve data files from the parent directory's cellular_planning_results folder
const DATA_DIR = join(__dirname, '..', 'cellular_planning_results');

app.get('/api/summary', async (req, res) => {
  try {
    const data = await readFile(join(DATA_DIR, 'summary_statistics.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: 'Summary statistics not found' });
  }
});

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Handle CSV with potential commas in quoted fields
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add last value
    
    const row = {};
    headers.forEach((header, idx) => {
      const val = (values[idx] || '').trim().replace(/^"|"$/g, '');
      // Parse numbers, but keep strings as strings
      if (val === '' || val === 'null' || val === 'undefined') {
        row[header] = null;
      } else if (!isNaN(val) && val !== '') {
        row[header] = parseFloat(val);
      } else {
        row[header] = val;
      }
    });
    rows.push(row);
  }
  
  return rows;
}

app.get('/api/towers', async (req, res) => {
  try {
    const data = await readFile(join(DATA_DIR, 'all_users_tower_recommendations.csv'), 'utf-8');
    const rows = parseCSV(data);
    res.json(rows);
  } catch (error) {
    res.status(404).json({ error: 'Tower recommendations not found' });
  }
});

app.get('/api/coverage', async (req, res) => {
  try {
    const data = await readFile(join(DATA_DIR, 'all_users_coverage_summary.csv'), 'utf-8');
    const rows = parseCSV(data);
    res.json(rows);
  } catch (error) {
    res.status(404).json({ error: 'Coverage summary not found' });
  }
});

app.get('/api/data/:user?', async (req, res) => {
  try {
    const { user } = req.params;
    let filePath;
    
    if (user && user !== 'all') {
      filePath = join(DATA_DIR, user, 'processed_data.csv');
    } else {
      // Prefer location data for network planning (has x,y coordinates)
      // Fallback to combined if location file doesn't exist
      filePath = join(DATA_DIR, 'cellular_merged_with_location.csv');
      try {
        await readFile(filePath);
      } catch {
        filePath = join(DATA_DIR, 'all_users_combined.csv');
      }
    }
    
    const data = await readFile(filePath, 'utf-8');
    const rows = parseCSV(data).slice(0, 10000); // Limit to 10k rows for performance
    
    // Ensure RSSI is properly parsed - check if signal_strength exists and use it if rssi is missing/invalid
    const processedRows = rows.map(row => {
      // If rssi is 0, null, or missing, try to use signal_strength
      if ((!row.rssi || row.rssi === 0) && row.signal_strength !== undefined && row.signal_strength !== null) {
        row.rssi = parseFloat(row.signal_strength);
      }
      // Ensure rssi is a number
      if (row.rssi !== undefined && row.rssi !== null) {
        row.rssi = parseFloat(row.rssi);
      }
      return row;
    });
    
    res.json(processedRows);
  } catch (error) {
    console.error('Error loading data:', error);
    res.status(404).json({ error: 'Data not found', details: error.message });
  }
});

app.get('/api/user/:user/summary', async (req, res) => {
  try {
    const { user } = req.params;
    const filePath = join(DATA_DIR, user, 'coverage_summary.csv');
    const data = await readFile(filePath, 'utf-8');
    const rows = parseCSV(data);
    res.json(rows);
  } catch (error) {
    res.status(404).json({ error: 'User summary not found' });
  }
});

app.get('/api/wifi', async (req, res) => {
  try {
    // Try to get WiFi info from system (macOS)
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      // Get current WiFi network (macOS)
      const { stdout: ssidOutput } = await execAsync('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I');
      const ssidMatch = ssidOutput.match(/SSID: (.+)/);
      const rssiMatch = ssidOutput.match(/agrCtlRSSI: (-?\d+)/);
      const bssidMatch = ssidOutput.match(/BSSID: ([a-fA-F0-9:]+)/);
      const channelMatch = ssidOutput.match(/channel: (\d+)/);
      
      const ssid = ssidMatch ? ssidMatch[1].trim() : 'Unknown';
      const rssi = rssiMatch ? parseInt(rssiMatch[1]) : -70;
      const bssid = bssidMatch ? bssidMatch[1] : 'N/A';
      const channel = channelMatch ? parseInt(channelMatch[1]) : 0;
      
      // Determine frequency based on channel
      const frequency = channel <= 14 ? 2400 : 5000;
      
      // Determine quality
      let quality = 'poor';
      if (rssi > -50) quality = 'excellent';
      else if (rssi > -70) quality = 'good';
      else if (rssi > -85) quality = 'fair';
      
      res.json({
        ssid,
        bssid,
        signalStrength: rssi,
        frequency,
        channel,
        security: 'WPA2/WPA3',
        quality,
        speed: '150 Mbps',
        ipAddress: '192.168.1.100',
        subnet: '255.255.255.0',
        gateway: '192.168.1.1'
      });
    } catch (execError) {
      // Fallback to demo data if system command fails
      res.json({
        ssid: 'Your WiFi Network',
        bssid: 'XX:XX:XX:XX:XX:XX',
        signalStrength: -65,
        frequency: 2400,
        channel: 6,
        security: 'WPA2/WPA3',
        quality: 'good',
        speed: '150 Mbps',
        ipAddress: '192.168.1.100',
        subnet: '255.255.255.0',
        gateway: '192.168.1.1'
      });
    }
  } catch (error) {
    console.error('WiFi info error:', error);
    res.status(500).json({ error: 'Unable to fetch WiFi information' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Data server running on http://localhost:${PORT}`);
});

