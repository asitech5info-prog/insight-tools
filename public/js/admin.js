// Admin Console Controller
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('insight_admin_token');
  if (token) {
    showAdminDashboard();
  } else {
    showLoginScreen();
  }

  bindAdminEvents();
});

function showLoginScreen() {
  document.getElementById('adminLoginScreen').style.display = 'flex';
  document.getElementById('adminApp').style.display = 'none';
}

function showAdminDashboard() {
  document.getElementById('adminLoginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'block';
  fetchAdminStats();
}

function bindAdminEvents() {
  // Login Form Submission
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pwd = document.getElementById('adminPasswordInput').value;
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('insight_admin_token', data.token);
          showAdminDashboard();
          showToast('Authenticated successfully', 'success');
        } else {
          showToast(data.error || 'Authentication failed', 'error');
        }
      } catch (err) {
        showToast('Server connection error', 'error');
      }
    });
  }

  // Logout
  document.getElementById('btnAdminLogout')?.addEventListener('click', () => {
    localStorage.removeItem('insight_admin_token');
    showLoginScreen();
    showToast('Logged out', 'info');
  });

  // Refresh Stats
  document.getElementById('btnRefreshStats')?.addEventListener('click', () => {
    fetchAdminStats();
    showToast('Stats refreshed', 'info');
  });

  // Purge RAM Memory (Render 512MB Optimization)
  document.getElementById('btnPurgeRAM')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/clear-cache', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        fetchAdminStats();
      }
    } catch (e) {
      showToast('Purge request failed', 'error');
    }
  });

  // Clean Storage Buttons
  const cleanStorageHandler = async () => {
    try {
      const res = await fetch('/api/admin/clean-storage', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        fetchAdminStats();
      }
    } catch (e) {
      showToast('Storage cleanup failed', 'error');
    }
  };

  document.getElementById('btnCleanStorage')?.addEventListener('click', cleanStorageHandler);
  document.getElementById('btnCleanStorageCard')?.addEventListener('click', cleanStorageHandler);

  // Save Config
  document.getElementById('btnSaveConfig')?.addEventListener('click', async () => {
    const maxFileSize = parseInt(document.getElementById('cfgMaxFileSize').value, 10);
    const maintenance = document.getElementById('cfgMaintenance').checked;

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            maxFileSizeMB: maxFileSize,
            maintenanceMode: maintenance
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Configuration updated', 'success');
      }
    } catch (e) {
      showToast('Failed to update config', 'error');
    }
  });

  // Clear Audit Logs View
  document.getElementById('btnClearLogs')?.addEventListener('click', () => {
    document.getElementById('auditLogsBody').innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">No activity recorded yet</td></tr>';
  });
}

async function fetchAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('insight_admin_token');
        showLoginScreen();
      }
      return;
    }

    const data = await res.json();
    renderStats(data);
  } catch (err) {
    console.error('Failed to load admin stats', err);
  }
}

function renderStats(data) {
  // 1. Top Metrics
  document.getElementById('valTotalConversions').textContent = data.totalConversions.toLocaleString();
  const mbProcessed = (data.totalBytesProcessed / (1024 * 1024)).toFixed(1);
  document.getElementById('valDataProcessed').textContent = `${mbProcessed} MB`;

  if (data.systemInfo) {
    const info = data.systemInfo;
    document.getElementById('valMemoryHeap').textContent = `${info.heapUsedMB} MB`;
    
    // RAM Progress bar for Render 512MB
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
      ramText.textContent = `${info.heapUsedMB} MB / 512 MB (${ramPercent}%)`;
    }

    const mins = Math.floor(info.processUptimeSec / 60);
    const hours = (mins / 60).toFixed(1);
    document.getElementById('valUptime').textContent = `Uptime: ${mins < 60 ? mins + 'm' : hours + 'h'}`;
    document.getElementById('sysUptimeText').textContent = `${hours} hours (${mins} mins)`;
    document.getElementById('sysNodeVersion').textContent = info.nodeVersion;
    document.getElementById('sysPlatform').textContent = `${info.platform} (${info.arch})`;
    document.getElementById('sysRenderStatus').textContent = info.renderStatus;
  }

  // 2. Render Tools Toggle List
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
      { id: 'extract-text', name: 'PDF to Text', icon: 'fa-align-left', color: '#14b8a6' }
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

  // 3. Render Audit Table
  const logsBody = document.getElementById('auditLogsBody');
  if (logsBody && data.recentLogs) {
    logsBody.innerHTML = '';
    if (data.recentLogs.length === 0) {
      logsBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">No activity recorded yet</td></tr>';
    } else {
      data.recentLogs.forEach(log => {
        const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${timeStr}</span></td>
          <td><span class="tool-badge-pill">${log.tool}</span></td>
          <td><strong style="color: var(--text-primary); font-size: 0.88rem;">${log.itemType || 'Client Stream'}</strong></td>
          <td>${log.size || '1.2 MB'}</td>
          <td><span style="font-family: var(--font-mono); font-size: 0.82rem;">${log.duration || '400ms'}</span></td>
          <td><span class="status-pill status-${log.status || 'success'}">${log.status || 'success'}</span></td>
        `;
        logsBody.appendChild(tr);
      });
    }
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-xmark';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}