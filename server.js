import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Serve static build assets from 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint for Railway deployment monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'chattask-frontend' });
});

// Single Page Application (SPA) routing fallback: all non-static requests return dist/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ChatTask production web service running on port ${PORT} (0.0.0.0)`);
});
