// Admin Console & Telemetry Controller
let adminToken = localStorage.getItem('insight_admin_token');
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  initAdmin();
});

function initAdmin() {
  const loginScreen = document.getElementById('adminLoginScreen');
  const adminApp = document.getElementById('adminApp');
  const loginForm = document.getElementById('adminLoginForm');
  const btnLogout = document.getElementById('btnAdminLogout');
  const btnClearRAM = document.getElementById('btnClearRAM');
  const btnCleanStorage = document.getElementById('btnCleanStorage');
  const btnCleanStorageCard = document.getElementById('btnCleanStorageCard');
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  const btnRefreshStats = document.getElementById('btnRefreshStats');
  const btnClearLogs = document.getElementById('btnClearLogs');

  // Check existing session
  if (adminToken) {
    showDashboard();
  } else {
    showLogin();
  }

  // Handle Login
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordInput = document.getElementById('adminPasswordInput');
    const password = passwordInput ? passwordInput.value : '';
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : 'Authenticate';
    
    try {
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        btn.disabled = true;
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        adminToken = data.token;
        localStorage.setItem('insight_admin_token', adminToken);
        showToast('Authenticated successfully', 'success');
        showDashboard();
      } else {
        showToast(data.error || 'Invalid credentials', 'error');
      }
    } catch (err) {
      showToast('Network error during authentication', 'error');
    } finally {
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  });

  // Handle Logout
  btnLogout?.addEventListener('click', () => {
    adminToken = null;
    localStorage.removeItem('insight_admin_token');
    if (refreshInterval) clearInterval(refreshInterval);
    showLogin();
    showToast('Logged out securely', 'info');
  });

  // Quick Action: Clear RAM
  btnClearRAM?.addEventListener('click', async () => {
    try {
      btnClearRAM.disabled = true;
      const res = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Memory Purged: ${data.freedMB || 0} MB released`, 'success');
        fetchStats();
      } else {
        showToast(data.error || 'Failed to purge memory', 'error');
      }
    } catch (_) {
      showToast('Network error during RAM purge', 'error');
    } finally {
      btnClearRAM.disabled = false;
    }
  });

  // Quick Action: Clean Temp Storage
  const triggerStorageClean = async (triggerBtn) => {
    try {
      if (triggerBtn) triggerBtn.disabled = true;
      const res = await fetch('/api/admin/clean-storage', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Storage cleaned: ${data.removedFilesCount || 0} files removed (${data.freedMB || 0} MB freed)`, 'success');
        fetchStats();
      } else {
        showToast(data.error || 'Failed to clean storage', 'error');
      }
    } catch (_) {
      showToast('Network error during storage cleanup', 'error');
    } finally {
      if (triggerBtn) triggerBtn.disabled = false;
    }
  };

  btnCleanStorage?.addEventListener('click', () => triggerStorageClean(btnCleanStorage));
  btnCleanStorageCard?.addEventListener('click', () => triggerStorageClean(btnCleanStorageCard));

  // Save Settings
  btnSaveConfig?.addEventListener('click', async () => {
    const maxFileEl = document.getElementById('cfgMaxFileSize');
    const maintEl = document.getElementById('cfgMaintenanceMode');
    const annEl = document.getElementById('cfgAnnouncement');

    const maxFileSize = maxFileEl ? parseInt(maxFileEl.value, 10) : 100;
    const maintenanceMode = maintEl ? maintEl.checked : false;
    const announcement = annEl ? annEl.value.trim() : '';

    try {
      btnSaveConfig.disabled = true;
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          config: {
            maxFileSizeMB: maxFileSize,
            maintenanceMode,
            announcement
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Configuration updated instantly', 'success');
      } else {
        showToast(data.error || 'Failed to update configuration', 'error');
      }
    } catch (_) {
      showToast('Network error while saving settings', 'error');
    } finally {
      btnSaveConfig.disabled = false;
    }
  });

  // Manual Refresh
  btnRefreshStats?.addEventListener('click', () => {
    fetchStats();
    showToast('Metrics updated', 'info');
  });

  // Clear Logs UI View
  btnClearLogs?.addEventListener('click', () => {
    const auditBody = document.getElementById('auditLogsBody');
    if (auditBody) {
      auditBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Audit display cleared. Live events will appear as transformations occur.</td></tr>';
    }
    showToast('Audit log view cleared', 'info');
  });
}

function showLogin() {
  const login = document.getElementById('adminLoginScreen');
  const app = document.getElementById('adminApp');
  if (login) login.style.display = 'flex';
  if (app) app.style.display = 'none';
}

function showDashboard() {
  const login = document.getElementById('adminLoginScreen');
  const app = document.getElementById('adminApp');
  if (login) login.style.display = 'none';
  if (app) app.style.display = 'block';
  fetchStats();
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(fetchStats, 10000); // 10s live pulse
}

async function fetchStats() {
  if (!adminToken) return;

  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.status === 401) {
      adminToken = null;
      localStorage.removeItem('insight_admin_token');
      showLogin();
      return;
    }

    const data = await res.json();
    if (res.ok) {
      renderDashboard(data);
    }
  } catch (err) {
    console.error('Error fetching admin statistics:', err);
  }
}

function renderDashboard(data) {
  // 1. Update Core Metrics
  const convEl = document.getElementById('valTotalConversions');
  if (convEl) convEl.textContent = (data.totalConversions || 0).toLocaleString();

  const dataEl = document.getElementById('valDataProcessed');
  if (dataEl) dataEl.textContent = formatBytes(data.totalBytesProcessed || 0);

  if (data.systemInfo) {
    const info = data.systemInfo;
    const heapEl = document.getElementById('valMemoryHeap');
    if (heapEl) heapEl.textContent = `${info.heapUsedMB || 0} MB`;
    
    // RAM Progress bar
    const ramPercent = info.renderRAMPercent || 15;
    const ramBar = document.getElementById('renderRamBar');
    if (ramBar) {
      ramBar.style.width = `${ramPercent}%`;
      if (ramPercent > 80) {
        ramBar.style.background = '#ef4444';
      } else if (ramPercent > 60) {
        ramBar.style.background = '#f59e0b';
      } else {
        ramBar.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
      }
    }
    const ramText = document.getElementById('renderRamUsageText');
    if (ramText) {
      ramText.textContent = `${info.heapUsedMB || 0} MB / 512 MB (${ramPercent}%)`;
    }

    const mins = Math.floor((info.processUptimeSec || 0) / 60);
    const hours = (mins / 60).toFixed(1);
    const uptimeEl = document.getElementById('valUptime');
    if (uptimeEl) uptimeEl.textContent = `Uptime: ${mins < 60 ? mins + 'm' : hours + 'h'}`;

    const sysUptime = document.getElementById('sysUptimeText');
    if (sysUptime) sysUptime.textContent = `${hours} hours (${mins} mins)`;

    const nodeEl = document.getElementById('sysNodeVersion');
    if (nodeEl) nodeEl.textContent = info.nodeVersion || 'Node.js';

    const platEl = document.getElementById('sysPlatform');
    if (platEl) platEl.textContent = `${info.platform || 'Server'} (${info.arch || 'x64'})`;

    const statusEl = document.getElementById('sysRenderStatus');
    if (statusEl) statusEl.textContent = info.renderStatus || 'Operational';
  }

  // 2. Render Tools Toggle List (All 23 tools)
  const toolListContainer = document.getElementById('toolToggleList');
  if (toolListContainer && data.toolUsage) {
    toolListContainer.innerHTML = '';
    const tools = [
      { id: 'word-to-pdf', name: 'Word to PDF', icon: 'fa-file-word', color: '#2563eb' },
      { id: 'pdf-to-word', name: 'PDF to Word', icon: 'fa-file-lines', color: '#2563eb' },
      { id: 'excel-to-pdf', name: 'Excel to PDF', icon: 'fa-file-excel', color: '#10b981' },
      { id: 'pdf-to-excel', name: 'PDF to Excel', icon: 'fa-table', color: '#10b981' },
      { id: 'ppt-to-pdf', name: 'PowerPoint to PDF', icon: 'fa-file-powerpoint', color: '#ef4444' },
      { id: 'merge', name: 'Merge PDF', icon: 'fa-object-group', color: '#ef4444' },
      { id: 'split', name: 'Split PDF', icon: 'fa-scissors', color: '#f59e0b' },
      { id: 'organize', name: 'Organize PDF', icon: 'fa-grip', color: '#8b5cf6' },
      { id: 'compress', name: 'Compress PDF', icon: 'fa-compress', color: '#10b981' },
      { id: 'pdf-to-img', name: 'PDF to Images', icon: 'fa-image', color: '#ec4899' },
      { id: 'img-to-pdf', name: 'Images to PDF', icon: 'fa-images', color: '#06b6d4' },
      { id: 'rotate', name: 'Rotate PDF', icon: 'fa-rotate-right', color: '#6366f1' },
      { id: 'watermark', name: 'Watermark PDF', icon: 'fa-stamp', color: '#f43f5e' },
      { id: 'page-number', name: 'Page Numbers', icon: 'fa-arrow-down-1-9', color: '#0ea5e9' },
      { id: 'protect', name: 'Protect PDF', icon: 'fa-lock', color: '#dc2626' },
      { id: 'unlock', name: 'Unlock PDF', icon: 'fa-lock-open', color: '#10b981' },
      { id: 'sign', name: 'Sign PDF', icon: 'fa-signature', color: '#4f46e5' },
      { id: 'bg-remover', name: 'Remove Background', icon: 'fa-wand-magic-sparkles', color: '#a855f7' },
      { id: 'extract-text', name: 'PDF to Text', icon: 'fa-align-left', color: '#14b8a6' },
      { id: 'ocr-pdf', name: 'OCR Recognition', icon: 'fa-file-invoice', color: '#0ea5e9' },
      { id: 'redact', name: 'Redact PDF', icon: 'fa-square-full', color: '#dc2626' },
      { id: 'metadata', name: 'Edit Metadata', icon: 'fa-tags', color: '#8b5cf6' },
      { id: 'grayscale', name: 'PDF to Grayscale', icon: 'fa-circle-half-stroke', color: '#64748b' }
    ];

    tools.forEach(t => {
      const count = data.toolUsage[t.id] || 0;
      const row = document.createElement('div');
      row.className = 'tool-item-row';
      row.innerHTML = `
        <div class="tool-info-cell">
          <div class="tool-cell-icon" style="color: ${t.color}; background: ${t.color}18;">
            <i class="fa-solid ${t.icon}"></i>
          </div>
          <div>
            <div class="tool-name-text">${t.name}</div>
            <div class="tool-id-sub">${t.id}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span class="tool-count-pill">${count} runs</span>
          <label class="switch">
            <input type="checkbox" checked data-tool-toggle="${t.id}">
            <span class="slider"></span>
          </label>
        </div>
      `;
      toolListContainer.appendChild(row);
    });
  }

  // 3. Render Audit Log Table
  const auditBody = document.getElementById('auditLogsBody');
  if (auditBody && data.logs) {
    auditBody.innerHTML = '';
    if (data.logs.length === 0) {
      auditBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No recent activities logged yet. Transformations will display here in real-time.</td></tr>';
    } else {
      data.logs.forEach(log => {
        const tr = document.createElement('tr');
        const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent';
        const statusClass = log.status === 'OK' ? 'badge-success' : 'badge-warning';
        
        tr.innerHTML = `
          <td><span style="font-family: monospace; font-size: 0.8rem;">${timeStr}</span></td>
          <td><strong>${log.action || 'OPERATION'}</strong></td>
          <td>${log.details || 'Document processed'}</td>
          <td><span class="status-badge ${statusClass}">${log.status || 'OK'}</span></td>
        `;
        auditBody.appendChild(tr);
      });
    }
  }

  // 4. Update Config Controls
  if (data.config) {
    const cfg = data.config;
    const maxFile = document.getElementById('cfgMaxFileSize');
    if (maxFile) maxFile.value = cfg.maxFileSizeMB || 100;
    
    const maint = document.getElementById('cfgMaintenanceMode');
    if (maint) maint.checked = !!cfg.maintenanceMode;

    const ann = document.getElementById('cfgAnnouncement');
    if (ann) ann.value = cfg.announcement || '';
  }
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
