/**
 * Insight Tools - High-Performance Express & Telemetry Server
 * Native zero-downtime micro-service & cloud orchestration layer
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Performance Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline scripts & CDNs for PDF-lib/PDF.js
  crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(compression({
  threshold: 1024,
  level: 6
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// In-Memory Telemetry & Metrics Store
const stats = {
  startTime: Date.now(),
  totalConversions: 0,
  totalBytesProcessed: 0,
  toolUsage: {
    'word-to-pdf': 0,
    'pdf-to-word': 0,
    'excel-to-pdf': 0,
    'pdf-to-excel': 0,
    'ppt-to-pdf': 0,
    'merge': 0,
    'split': 0,
    'organize': 0,
    'compress': 0,
    'pdf-to-img': 0,
    'img-to-pdf': 0,
    'rotate': 0,
    'watermark': 0,
    'page-number': 0,
    'protect': 0,
    'unlock': 0,
    'sign': 0,
    'bg-remover': 0,
    'extract-text': 0,
    'ocr-pdf': 0,
    'redact': 0,
    'metadata': 0,
    'grayscale': 0
  },
  recentLogs: []
};

// Admin dynamic runtime configuration
let serverConfig = {
  maintenanceMode: false,
  announcement: '',
  maxFileSizeMB: 100
};

// Ensure working temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Static Assets with Cache-Control
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true
}));

// Admin panel explicit route aliases
app.get(['/admin', '/admin/', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Periodic Temp Cleanup Routine (Every 30 minutes)
setInterval(() => {
  cleanTempStorage();
}, 30 * 60 * 1000);

function cleanTempStorage() {
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    let removedCount = 0;
    let freedBytes = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > 60 * 60 * 1000) { // Older than 1 hour
          freedBytes += stats.size;
          fs.unlinkSync(filePath);
          removedCount++;
        }
      } catch (_) {}
    }

    if (removedCount > 0) {
      logAudit('TEMP_CLEANUP', `Cleaned ${removedCount} files (${(freedBytes / (1024 * 1024)).toFixed(2)} MB freed)`);
    }
    return { removedCount, freedBytes };
  } catch (err) {
    console.error('Error cleaning temp directory:', err);
    return { removedCount: 0, freedBytes: 0 };
  }
}

function logAudit(action, details, status = 'OK') {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    details,
    status
  };
  stats.recentLogs.unshift(entry);
  if (stats.recentLogs.length > 50) stats.recentLogs.pop();
}

/* ==========================================================================
   PUBLIC API ENDPOINTS
   ========================================================================== */

/**
 * Health Check Probe for Cloud Monitoring
 */
app.get('/api/health', (req, res) => {
  const uptimeSec = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'healthy',
    uptime: uptimeSec,
    timestamp: new Date().toISOString(),
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024)
    },
    version: '1.0.0'
  });
});

/**
 * Client-Side Telemetry Ingestion (Anonymous usage metrics)
 */
app.post('/api/telemetry', (req, res) => {
  try {
    const { tool, sizeBytes, durationMs } = req.body;
    stats.totalConversions++;
    if (sizeBytes && typeof sizeBytes === 'number') {
      stats.totalBytesProcessed += sizeBytes;
    }
    if (tool && stats.toolUsage[tool] !== undefined) {
      stats.toolUsage[tool]++;
    }

    logAudit('TOOL_USAGE', `Tool [${tool || 'unknown'}] executed successfully in ${durationMs || 0}ms`);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to record telemetry' });
  }
});

/**
 * Public Server Configuration Check
 */
app.get('/api/config', (req, res) => {
  res.status(200).json({
    maintenanceMode: serverConfig.maintenanceMode,
    announcement: serverConfig.announcement,
    maxFileSizeMB: serverConfig.maxFileSizeMB
  });
});

/* ==========================================================================
   ADMIN & OPERATIONS APIS
   ========================================================================== */

const ADMIN_SECRET = process.env.ADMIN_PASSWORD || 'vape1098';

// Authentication Middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Access token is invalid' });
  }
  next();
}

/**
 * Admin Login Verification
 */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_SECRET) {
    logAudit('ADMIN_AUTH', 'Admin console authenticated successfully');
    return res.status(200).json({ success: true, token: ADMIN_SECRET });
  }
  logAudit('ADMIN_AUTH_FAIL', 'Failed admin login attempt', 'WARNING');
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

/**
 * Admin Dashboard Comprehensive Metrics
 */
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  const mem = process.memoryUsage();
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  
  // Calculate RAM percentage for Render 512MB free tier container
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const renderRamPercent = Math.min(Math.round((rssMB / 512) * 100), 100);

  res.status(200).json({
    totalConversions: stats.totalConversions,
    totalBytesProcessed: stats.totalBytesProcessed,
    toolUsage: stats.toolUsage,
    systemInfo: {
      uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      processUptimeSec: uptime,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      heapUsedMB: heapMB,
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: rssMB,
      renderRAMPercent: renderRamPercent,
      renderStatus: 'Container Optimized (512MB Cap Safe)'
    },
    logs: stats.recentLogs,
    config: serverConfig
  });
});

/**
 * Admin Operation: Purge Node.js Garbage Collection & RAM
 */
app.post('/api/admin/clear-cache', requireAdminAuth, (req, res) => {
  try {
    const beforeHeap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    if (global.gc) {
      global.gc();
    }
    const afterHeap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const freedMB = Math.max(0, beforeHeap - afterHeap);

    logAudit('ADMIN_PURGE_RAM', `Manual memory optimization executed. Freed ${freedMB} MB`);
    res.status(200).json({
      success: true,
      message: 'RAM garbage collection executed successfully.',
      freedMB: freedMB,
      currentHeapMB: afterHeap
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to purge memory' });
  }
});

/**
 * Admin Operation: Clean Server Storage
 */
app.post('/api/admin/clean-storage', requireAdminAuth, (req, res) => {
  const result = cleanTempStorage();
  logAudit('ADMIN_CLEAN_STORAGE', `Manual storage cleanup: ${result.removedCount} files deleted`);
  res.status(200).json({
    success: true,
    message: 'Temporary storage cleaned.',
    removedFilesCount: result.removedCount,
    freedMB: (result.freedBytes / (1024 * 1024)).toFixed(2)
  });
});

/**
 * Admin Operation: Dynamic Server Runtime Configuration
 */
app.post('/api/admin/config', requireAdminAuth, (req, res) => {
  try {
    const { config } = req.body;
    if (config) {
      if (typeof config.maintenanceMode === 'boolean') serverConfig.maintenanceMode = config.maintenanceMode;
      if (typeof config.announcement === 'string') serverConfig.announcement = config.announcement;
      if (typeof config.maxFileSizeMB === 'number') serverConfig.maxFileSizeMB = config.maxFileSizeMB;
      
      logAudit('ADMIN_CONFIG_UPDATE', `Configuration updated: Maintenance=${serverConfig.maintenanceMode}, MaxSize=${serverConfig.maxFileSizeMB}MB`);
    }
    res.status(200).json({ success: true, config: serverConfig });
  } catch (err) {
    res.status(400).json({ error: 'Invalid configuration payload' });
  }
});

/**
 * General Metadata Endpoint
 */
app.get('/api/info', (req, res) => {
  res.status(200).json({
    name: 'Insight Tools',
    tagline: 'High-Performance Document & PDF Suite',
    supportedToolsCount: 23,
    categories: ['office', 'organize', 'convert', 'security']
  });
});

// Single Page Application Fallback (redirect unknown paths to index)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Insight Tools Server is actively running!`);
    console.log(`  Local URL:  http://localhost:${PORT}`);
    console.log(`  Admin URL:  http://localhost:${PORT}/admin`);
    console.log(`  Health API: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
