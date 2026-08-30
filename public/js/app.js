// Main Application State & SPA Routing Controller
const app = {
  currentTool: null,
  files: [],
  activeResultBlob: null,
  activeFilename: 'document.pdf',
  activeMimeType: 'application/pdf',

  tools: {
    'word-to-pdf': toolWordToPdf,
    'pdf-to-word': toolPdfToWord,
    'excel-to-pdf': toolExcelToPdf,
    'pdf-to-excel': toolPdfToExcel,
    'ppt-to-pdf': toolPptToPdf,
    'merge': toolMerge,
    'split': toolSplit,
    'organize': toolOrganize,
    'compress': toolCompress,
    'pdf-to-img': toolPdfToImg,
    'img-to-pdf': toolImgToPdf,
    'rotate': toolRotate,
    'watermark': toolWatermark,
    'page-number': toolPageNumber,
    'protect': toolProtect,
    'unlock': toolUnlock,
    'sign': toolSign,
    'bg-remover': toolBgRemover,
    'extract-text': toolExtractText,
    'ocr-pdf': toolOcrPdf,
    'redact': toolRedact,
    'metadata': toolMetadata,
    'grayscale': toolGrayscale
  },

  init() {
    this.bindEvents();
    this.initTheme();
    this.handleRoute();
  },

  bindEvents() {
    // Hash Routing
    window.addEventListener('hashchange', () => this.handleRoute());

    // Navigation & Tool Cards
    document.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const toolId = card.getAttribute('data-tool');
        if (toolId) window.location.hash = `#/${toolId}`;
      });
    });

    // Footer Tool Links
    document.querySelectorAll('.footer-col a[data-tool]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const toolId = link.getAttribute('data-tool');
        if (toolId) {
          window.location.hash = `#/${toolId}`;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Back to Home Button
    document.getElementById('btnBackToHome')?.addEventListener('click', () => {
      window.location.hash = '#/';
    });

    // Logo Click -> Home
    document.getElementById('navLogo')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#/';
    });

    // Search Filtering
    const searchInput = document.getElementById('toolSearchInput');
    searchInput?.addEventListener('input', (e) => this.filterTools(e.target.value));

    // Category Tabs Filtering
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-category');
        this.filterCategory(cat);
      });
    });

    // Dropzone Events
    const dropzoneBox = document.getElementById('dropzoneBox');
    const fileInput = document.getElementById('fileInput');
    const btnSelectFiles = document.getElementById('btnSelectFiles');

    btnSelectFiles?.addEventListener('click', () => fileInput?.click());
    dropzoneBox?.addEventListener('click', (e) => {
      if (e.target !== btnSelectFiles && !btnSelectFiles?.contains(e.target)) {
        fileInput?.click();
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFilesSelected(Array.from(e.target.files));
      }
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzoneBox?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneBox.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzoneBox?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneBox.classList.remove('drag-over');
      });
    });

    dropzoneBox?.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleFilesSelected(Array.from(e.dataTransfer.files));
      }
    });

    // Action Execution
    document.getElementById('btnExecuteAction')?.addEventListener('click', () => {
      this.executeCurrentTool();
    });

    // Success Screen Actions
    document.getElementById('btnDownloadPrimary')?.addEventListener('click', () => {
      this.triggerDownload();
    });

    document.getElementById('btnStartOver')?.addEventListener('click', () => {
      this.resetWorkspace();
    });

    // Canvas Clear All & Add More
    document.getElementById('btnClearAll')?.addEventListener('click', () => {
      this.resetWorkspace();
    });

    document.getElementById('btnAddMoreFiles')?.addEventListener('click', () => {
      fileInput?.click();
    });
  },

  initTheme() {
    const savedTheme = localStorage.getItem('insight_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('insight_theme', next);
      this.updateThemeIcon(next);
    });
  },

  updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    btn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  },

  handleRoute() {
    const hash = window.location.hash || '#/';
    if (hash === '#/admin' || hash === '#admin') {
      window.location.href = '/admin';
      return;
    }
    const cleanHash = hash.replace(/^#\/?/, '');

    if (!cleanHash || cleanHash === '') {
      this.showHomeView();
    } else if (this.tools[cleanHash]) {
      this.showToolWorkspace(cleanHash);
    } else {
      this.showHomeView();
    }
  },

  showHomeView() {
    this.currentTool = null;
    this.files = [];
    document.getElementById('homeView').style.display = 'block';
    document.getElementById('workspaceSection').style.display = 'none';
    document.getElementById('workspaceSection').classList.remove('active');
    document.title = 'Insight Tools - All-In-One Free & Secure PDF Suite';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async showToolWorkspace(toolId) {
    const tool = this.tools[toolId];
    if (!tool) return;

    this.currentTool = tool;
    this.files = [];
    this.activeResultBlob = null;

    document.getElementById('homeView').style.display = 'none';
    const ws = document.getElementById('workspaceSection');
    ws.style.display = 'block';
    ws.classList.add('active');

    // Update Header Info
    document.getElementById('wsToolTitle').textContent = tool.title;
    document.getElementById('wsToolDesc').textContent = tool.description;
    const iconContainer = document.getElementById('wsToolIcon');
    if (iconContainer) {
      iconContainer.innerHTML = `<i class="fa-solid ${tool.icon}"></i>`;
      iconContainer.style.background = `${tool.themeColor}22`;
      iconContainer.style.color = tool.themeColor;
    }

    // Configure File Input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.value = '';
      fileInput.accept = tool.accept || '*/*';
      fileInput.multiple = !!tool.multiple;
    }

    const acceptedPill = document.getElementById('acceptedFormatPill');
    if (acceptedPill) {
      acceptedPill.innerHTML = `<i class="fa-solid fa-file"></i> Accepts: <strong>${tool.accept || 'All formats'}</strong>`;
    }

    const btnExecText = document.getElementById('btnExecuteText');
    if (btnExecText) {
      btnExecText.textContent = tool.actionButtonText || 'Process Document';
    }

    // Show initial dropzone, hide active & success
    document.getElementById('dropzoneContainer').style.display = 'block';
    document.getElementById('activeWorkspace').style.display = 'none';
    document.getElementById('successScreen').style.display = 'none';

    document.title = `${tool.title} | Insight Tools`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async handleFilesSelected(newFiles) {
    if (!this.currentTool || newFiles.length === 0) return;

    if (!this.currentTool.multiple) {
      this.files = [newFiles[0]];
    } else {
      this.files = [...this.files, ...newFiles];
    }

    // Render Options and Canvas
    document.getElementById('dropzoneContainer').style.display = 'none';
    document.getElementById('activeWorkspace').style.display = 'grid';
    document.getElementById('successScreen').style.display = 'none';

    const optionsContainer = document.getElementById('optionsContainer');
    const filesContainer = document.getElementById('filesContainer');
    const pagesContainer = document.getElementById('pagesContainer');
    const textExtractContainer = document.getElementById('textExtractContainer');

    // Reset sub-containers
    if (filesContainer) { filesContainer.innerHTML = ''; filesContainer.style.display = 'none'; }
    if (pagesContainer) { pagesContainer.innerHTML = ''; pagesContainer.style.display = 'none'; }
    if (textExtractContainer) { textExtractContainer.style.display = 'none'; }

    // Inspect first file for metadata (like page count)
    let meta = null;
    if (this.files[0] && this.files[0].name.toLowerCase().endsWith('.pdf')) {
      try {
        meta = await PDFEngine.inspectPDF(this.files[0]);
      } catch (e) {
        console.warn('Metadata inspect warning:', e);
      }
    }

    // Call tool options renderer
    if (typeof this.currentTool.renderOptions === 'function') {
      this.currentTool.renderOptions(optionsContainer, meta);
    }

    // Call tool workspace renderer (if custom visual workspace)
    if (typeof this.currentTool.renderWorkspace === 'function') {
      await this.currentTool.renderWorkspace({
        filesContainer,
        pagesContainer,
        textExtractContainer
      }, this.files);
    } else {
      // Default Files Grid
      if (filesContainer) {
        filesContainer.style.display = 'grid';
        this.renderDefaultFilesGrid(filesContainer);
      }
    }
  },

  renderDefaultFilesGrid(container) {
    container.innerHTML = '';
    this.files.forEach((file, idx) => {
      const card = document.createElement('div');
      card.className = 'file-card-item';
      card.innerHTML = `
        <div class="file-card-actions">
          <button class="card-action-btn" title="Remove" data-index="${idx}"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="file-card-preview">
          <i class="fa-solid fa-file-pdf pdf-fallback-icon"></i>
        </div>
        <div class="file-card-name" title="${file.name}">${file.name}</div>
        <div class="file-card-meta">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
      `;

      card.querySelector('.card-action-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.files.splice(idx, 1);
        if (this.files.length === 0) {
          this.resetWorkspace();
        } else {
          this.renderDefaultFilesGrid(container);
        }
      });

      container.appendChild(card);
    });
  },

  async executeCurrentTool() {
    if (!this.currentTool || this.files.length === 0) {
      this.showToast('Please select at least one file to proceed', 'warning');
      return;
    }

    this.showProgress(10, 'Initializing secure WebAssembly engine...');

    try {
      const result = await this.currentTool.process(this.files, this);

      if (result) {
        let rawData = result.data;
        if (rawData instanceof Uint8Array || (rawData && rawData.buffer instanceof ArrayBuffer && !(rawData instanceof Blob))) {
          rawData = new Blob([rawData], { type: result.mimeType || 'application/pdf' });
        }
        this.activeResultBlob = rawData;
        this.activeFilename = result.filename || 'processed_document.pdf';
        this.activeMimeType = result.mimeType || 'application/pdf';

        this.hideProgress();
        this.showSuccess(result);

        // Record anonymous telemetry
        this.recordTelemetry(this.currentTool.id, this.files);
      }
    } catch (err) {
      this.hideProgress();
      console.error('Processing error:', err);
      this.showToast(`Error: ${err.message || 'Operation failed'}`, 'error');
    }
  },

  showSuccess(result) {
    document.getElementById('dropzoneContainer').style.display = 'none';
    document.getElementById('activeWorkspace').style.display = 'none';
    const successScreen = document.getElementById('successScreen');
    successScreen.style.display = 'block';

    const successDesc = document.getElementById('successDesc');
    if (successDesc) {
      successDesc.textContent = result.summary || 'Your file is processed and ready for download.';
    }

    const btnDownloadText = document.getElementById('btnDownloadText');
    if (btnDownloadText) {
      btnDownloadText.textContent = `Download ${result.filename || 'File'}`;
    }

    window.scrollTo({ top: 100, behavior: 'smooth' });
  },

  triggerDownload() {
    if (!this.activeResultBlob) {
      this.showToast('No processed file found to download', 'warning');
      return;
    }
    PDFEngine.downloadFile(this.activeResultBlob, this.activeFilename, this.activeMimeType);
    this.showToast(`Downloading ${this.activeFilename}`, 'success');
  },

  resetWorkspace() {
    if (this.currentTool) {
      this.showToolWorkspace(this.currentTool.id);
    } else {
      this.showHomeView();
    }
  },

  showProgress(percent, statusText) {
    const modal = document.getElementById('processingModal');
    const bar = document.getElementById('progressBarFill');
    const txt = document.getElementById('processStatusSubtitle');
    const num = document.getElementById('progressPercent');

    if (modal) modal.classList.add('active');
    if (bar) bar.style.width = `${percent}%`;
    if (txt) txt.textContent = statusText || 'Processing...';
    if (num) num.textContent = `${percent}%`;
  },

  updateProgress(percent, statusText) {
    this.showProgress(percent, statusText);
  },

  hideProgress() {
    const modal = document.getElementById('processingModal');
    if (modal) modal.classList.remove('active');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';
    if (type === 'warning') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  filterTools(query) {
    const q = query.toLowerCase().trim();
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const title = card.querySelector('.tool-title')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.tool-desc')?.textContent.toLowerCase() || '';
      if (!q || title.includes(q) || desc.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  },

  filterCategory(category) {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const cat = card.getAttribute('data-category');
      if (category === 'all' || cat === category) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  },

  async recordTelemetry(toolId, files) {
    try {
      const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, fileSizeBytes: totalSize })
      });
    } catch (_) {
      // Non-blocking telemetry
    }
  }
};

// Start application
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
