/**
 * Insight Tools - Admin Dashboard Controller
 */

const ALL_TOOLS_REGISTRY = [
  { id: 'merge', name: 'Merge PDF', icon: 'fa-object-group', color: '#ef4444' },
  { id: 'split', name: 'Split PDF', icon: 'fa-scissors', color: '#f59e0b' },
  { id: 'organize', name: 'Organize PDF', icon: 'fa-table-cells-large', color: '#8b5cf6' },
  { id: 'compress', name: 'Compress PDF', icon: 'fa-file-zipper', color: '#10b981' },
  { id: 'word-to-pdf', name: 'Word to PDF', icon: 'fa-file-word', color: '#2563eb' },
  { id: 'pdf-to-word', name: 'PDF to Word', icon: 'fa-file-word', color: '#3b82f6' },
  { id: 'excel-to-pdf', name: 'Excel to PDF', icon: 'fa-file-excel', color: '#16a34a' },
  { id: 'pdf-to-excel', name: 'PDF to Excel', icon: 'fa-file-excel', color: '#10b981' },
  { id: 'ppt-to-pdf', name: 'PowerPoint to PDF', icon: 'fa-file-powerpoint', color: '#ea580c' },
  { id: 'pdf-to-img', name: 'PDF to JPG / PNG', icon: 'fa-file-image', color: '#06b6d4' },
  { id: 'img-to-pdf', name: 'Images to PDF', icon: 'fa-images', color: '#3b82f6' },
  { id: 'rotate', name: 'Rotate PDF', icon: 'fa-rotate', color: '#ec4899' },
  { id: 'watermark', name: 'Watermark PDF', icon: 'fa-stamp', color: '#6366f1' },
  { id: 'page-number', name: 'Page Numbers', icon: 'fa-arrow-down-1-9', color: '#14b8a6' },
  { id: 'protect', name: 'Protect PDF', icon: 'fa-shield-virus', color: '#ef4444' },
  { id: 'unlock', name: 'Unlock PDF', icon: 'fa-lock-open', color: '#10b981' },
  { id: 'sign', name: 'Sign PDF', icon: 'fa-signature', color: '#8b5cf6' },
  { id: 'bg-remover', name: 'Remove Background', icon: 'fa-wand-magic-sparkles', color: '#ec4899' },
  { id: 'extract-text', name: 'PDF to Text', icon: 'fa-file-lines', color: '#0ea5e9' }
];

class AdminApp {
  constructor() {
    this.isAuthenticated = sessionStorage.getItem('insight_admin_auth') === 'true';
    this.currentStats = null;
    this.pollTimer = null;

    this.initElements();
    this.bindEvents();
    this.checkAuth();
  }

  initElements() {
    this.loginScreen = document.getElementById('adminLoginScreen');
    this.adminApp = document.getElementById('adminApp');
    this.loginForm = document.getElementById('adminLoginForm');
    this.passwordInput = document.getElementById('adminPasswordInput');

    this.btnRefresh = document.getElementById('btnRefreshStats');
    this.btnLogout = document.getElementById('btnAdminLogout');
    this.btnSaveConfig = document.getElementById('btnSaveConfig');
    this.btnClearLogs = document.getElementById('btnClearLogs');
    this.btnPurgeRAM = document.getElementById('btnPurgeRAM');
    this.btnCleanStorage = document.getElementById('btnCleanStorage');
    this.btnCleanStorageCard = document.getElementById('btnCleanStorageCard');

    this.valTotalConversions = document.getElementById('valTotalConversions');
    this.valDataProcessed = document.getElementById('valDataProcessed');
    this.valActiveTools = document.getElementById('valActiveTools');
    this.valMemoryHeap = document.getElementById('valMemoryHeap');
    this.valUptime = document.getElementById('valUptime');

    this.toolToggleList = document.getElementById('toolToggleList');
    this.auditLogsBody = document.getElementById('auditLogsBody');
    this.toolCountBadge = document.getElementById('toolCountBadge');

    this.sysRenderStatus = document.getElementById('sysRenderStatus');
    this.sysNodeVersion = document.getElementById('sysNodeVersion');
    this.sysPlatform = document.getElementById('sysPlatform');
    this.sysFreeMem = document.getElementById('sysFreeMem');
    this.sysDiskUsage = document.getElementById('sysDiskUsage');
    this.sysUptimeText = document.getElementById('sysUptimeText');
    this.renderRamBar = document.getElementById('renderRamBar');
    this.renderRamUsageText = document.getElementById('renderRamUsageText');

    this.cfgMaxFileSize = document.getElementById('cfgMaxFileSize');
    this.cfgMaintenance = document.getElementById('cfgMaintenance');
  }

  bindEvents() {
    this.loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    this.btnLogout?.addEventListener('click', () => this.handleLogout());
    this.btnRefresh?.addEventListener('click', () => {
      this.fetchStats();
      this.showToast('Metrics refreshed', 'info');
    });

    this.btnPurgeRAM?.addEventListener('click', () => this.purgeMemoryCache());
    this.btnCleanStorage?.addEventListener('click', () => this.cleanStorage());
    this.btnCleanStorageCard?.addEventListener('click', () => this.cleanStorage());

    this.btnSaveConfig?.addEventListener('click', () => this.saveGlobalConfig());
    this.btnClearLogs?.addEventListener('click', () => {
      if (this.auditLogsBody) this.auditLogsBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Audit log view cleared</td></tr>';
      this.showToast('Log view cleared', 'info');
    });
  }

  async cleanStorage() {
    try {
      this.showToast('Scanning and cleaning server disk storage...', 'info');
      const res = await fetch('/api/admin/clean-storage', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast(data.message, 'success');
        if (this.sysDiskUsage) {
          this.sysDiskUsage.textContent = '0.00 MB (Clean)';
        }
      }
    } catch (e) {
      this.showToast('Failed to clean storage', 'error');
    }
  }

  async purgeMemoryCache() {
    try {
      this.showToast('Purging memory & trimming cache...', 'info');
      const res = await fetch('/api/admin/clear-cache', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Purged! Current heap: ${data.currentHeapMB} MB / 512 MB`, 'success');
        this.fetchStats();
      }
    } catch (e) {
      this.showToast('Failed to purge cache', 'error');
    }
  }

  checkAuth() {
    if (this.isAuthenticated) {
      if (this.loginScreen) this.loginScreen.style.display = 'none';
      if (this.adminApp) this.adminApp.style.display = 'block';
      this.fetchStats();
      this.startPolling();
    } else {
      if (this.loginScreen) this.loginScreen.style.display = 'flex';
      if (this.adminApp) this.adminApp.style.display = 'none';
      this.stopPolling();
    }
  }

  async handleLogin() {
    const password = this.passwordInput?.value;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('insight_admin_auth', 'true');
        this.isAuthenticated = true;
        this.checkAuth();
        this.showToast('Welcome to Insight Tools Console', 'success');
      } else {
        this.showToast(data.error || 'Invalid credentials', 'error');
      }
    } catch (err) {
      this.showToast('Connection error to admin API', 'error');
    }
  }

  handleLogout() {
    sessionStorage.removeItem('insight_admin_auth');
    this.isAuthenticated = false;
    this.checkAuth();
    this.showToast('Signed out of admin console', 'info');
  }

  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.fetchStats(), 5000);
  }

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  async fetchStats() {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const stats = await res.json();
        this.currentStats = stats;
        this.renderStats(stats);
      }
    } catch (err) {
      console.warn('Failed to fetch admin stats:', err);
    }
  }

  renderStats(stats) {
    if (this.valTotalConversions) {
      this.valTotalConversions.textContent = Number(stats.totalConversions || 0).toLocaleString();
    }

    if (this.valDataProcessed) {
      const mb = (stats.totalBytesProcessed / (1024 * 1024)).toFixed(1);
      this.valDataProcessed.textContent = `${mb} MB`;
    }

    const disabledList = stats.config?.disabledTools || [];
    const activeCount = ALL_TOOLS_REGISTRY.length - disabledList.length;
    if (this.valActiveTools) {
      this.valActiveTools.textContent = `${activeCount} / ${ALL_TOOLS_REGISTRY.length}`;
    }
    if (this.toolCountBadge) {
      this.toolCountBadge.textContent = `${activeCount} Active`;
    }

    if (this.valMemoryHeap && stats.systemInfo) {
      this.valMemoryHeap.textContent = `${stats.systemInfo.heapUsedMB} MB`;
    }

    if (this.valUptime && stats.systemInfo) {
      const mins = Math.floor(stats.systemInfo.processUptimeSec / 60);
      const secs = stats.systemInfo.processUptimeSec % 60;
      this.valUptime.textContent = `Uptime: ${mins}m ${secs}s`;
    }

    // System Info
    if (stats.systemInfo) {
      if (this.sysRenderStatus) this.sysRenderStatus.textContent = stats.systemInfo.renderStatus;
      if (this.sysNodeVersion) this.sysNodeVersion.textContent = stats.systemInfo.nodeVersion;
      if (this.sysPlatform) this.sysPlatform.textContent = `${stats.systemInfo.platform} (${stats.systemInfo.arch})`;
      if (this.sysUptimeText) {
        const hours = (stats.systemInfo.processUptimeSec / 3600).toFixed(1);
        this.sysUptimeText.textContent = `${hours} hours`;
      }

      if (this.renderRamUsageText && this.renderRamBar) {
        const percent = stats.systemInfo.renderRAMPercent || 10;
        this.renderRamUsageText.textContent = `${stats.systemInfo.heapUsedMB} MB / 512 MB (${percent}%)`;
        this.renderRamBar.style.width = `${percent}%`;

        if (percent > 80) {
          this.renderRamBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        } else if (percent > 50) {
          this.renderRamBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else {
          this.renderRamBar.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
        }
      }
    }

    // Configuration Inputs
    if (this.cfgMaxFileSize && stats.config?.maxFileSizeMB) {
      this.cfgMaxFileSize.value = stats.config.maxFileSizeMB;
    }
    if (this.cfgMaintenance && stats.config) {
      this.cfgMaintenance.checked = !!stats.config.maintenanceMode;
    }

    // Render Tools List with Toggles
    this.renderToolToggles(stats.toolUsage || {}, disabledList);

    // Render Audit Logs
    this.renderAuditLogs(stats.recentLogs || []);
  }

  renderToolToggles(usageMap, disabledList) {
    if (!this.toolToggleList) return;

    this.toolToggleList.innerHTML = '';

    ALL_TOOLS_REGISTRY.forEach(tool => {
      const isDisabled = disabledList.includes(tool.id);
      const count = usageMap[tool.id] || 0;

      const item = document.createElement('div');
      item.className = 'tool-mgmt-item';
      item.innerHTML = `
        <div class="tool-mgmt-left">
          <div class="tool-mgmt-icon" style="background: ${tool.color}22; color: ${tool.color};">
            <i class="fa-solid ${tool.icon}"></i>
          </div>
          <div>
            <div class="tool-mgmt-title">${tool.name}</div>
            <div class="tool-mgmt-count">${count} conversions executed</div>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" class="tool-toggle-input" data-tool="${tool.id}" ${!isDisabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      `;

      this.toolToggleList.appendChild(item);
    });

    // Bind Toggle events
    this.toolToggleList.querySelectorAll('.tool-toggle-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const toolId = e.target.getAttribute('data-tool');
        const enabled = e.target.checked;
        this.toggleToolState(toolId, enabled);
      });
    });
  }

  async toggleToolState(toolId, isEnabled) {
    if (!this.currentStats) return;

    let disabledTools = [...(this.currentStats.config?.disabledTools || [])];
    if (isEnabled) {
      disabledTools = disabledTools.filter(id => id !== toolId);
    } else {
      if (!disabledTools.includes(toolId)) disabledTools.push(toolId);
    }

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { disabledTools } })
      });
      if (res.ok) {
        this.showToast(`${toolId} ${isEnabled ? 'enabled' : 'disabled'}`, 'info');
        this.fetchStats();
      }
    } catch (err) {
      this.showToast('Failed to update tool state', 'error');
    }
  }

  async saveGlobalConfig() {
    const maxMB = parseInt(this.cfgMaxFileSize?.value || '100', 10);
    const maintenance = this.cfgMaintenance?.checked ?? false;

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            maxFileSizeMB: maxMB,
            maintenanceMode: maintenance
          }
        })
      });
      if (res.ok) {
        this.showToast('Global configuration saved', 'success');
        this.fetchStats();
      }
    } catch (err) {
      this.showToast('Failed to save configuration', 'error');
    }
  }

  renderAuditLogs(logs) {
    if (!this.auditLogsBody) return;

    if (!logs || logs.length === 0) {
      this.auditLogsBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No activity recorded yet</td></tr>';
      return;
    }

    this.auditLogsBody.innerHTML = '';
    logs.forEach(log => {
      const tr = document.createElement('tr');
      const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      tr.innerHTML = `
        <td style="font-family: var(--font-mono); color: var(--text-muted);">${timeStr}</td>
        <td><strong style="color: var(--primary);">${log.tool}</strong></td>
        <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${log.filename}</td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem;">${log.size}</td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem;">${log.duration}</td>
        <td><span class="status-tag success">${log.status}</span></td>
      `;

      this.auditLogsBody.appendChild(tr);
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    let icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.Admin = new AdminApp();
});
