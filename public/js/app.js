/**
 * Insight Tools - Main Application Controller
 * Manages tool switching, state, file dropzones, thumbnail previews, and toasts
 */

class InsightApp {
  constructor() {
    this.currentTool = null;
    this.currentFiles = [];
    this.pageStates = [];
    this.draggedFileIndex = null;
    this.draggedPageIndex = null;
    this.lastResultBlob = null;
    this.lastResultFilename = '';

    this.initTheme();
    this.initElements();
    this.bindEvents();
    this.handleRoute();
  }

  /* -------------------------------------------------------------------------- */
  /* Theme Initialization                                                      */
  /* -------------------------------------------------------------------------- */
  initTheme() {
    const savedTheme = localStorage.getItem('insight_tools_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('insight_tools_theme', newTheme);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
  }

  /* -------------------------------------------------------------------------- */
  /* DOM Element References                                                    */
  /* -------------------------------------------------------------------------- */
  initElements() {
    this.homeView = document.getElementById('homeView');
    this.workspaceSection = document.getElementById('workspaceSection');
    this.dropzoneContainer = document.getElementById('dropzoneContainer');
    this.activeWorkspace = document.getElementById('activeWorkspace');
    this.successScreen = document.getElementById('successScreen');
    this.processingModal = document.getElementById('processingModal');

    this.fileInput = document.getElementById('fileInput');
    this.btnSelectFiles = document.getElementById('btnSelectFiles');
    this.btnAddMoreFiles = document.getElementById('btnAddMoreFiles');
    this.btnClearAll = document.getElementById('btnClearAll');
    this.btnExecuteAction = document.getElementById('btnExecuteAction');
    this.btnStartOver = document.getElementById('btnStartOver');
    this.btnDownloadPrimary = document.getElementById('btnDownloadPrimary');

    this.filesContainer = document.getElementById('filesContainer');
    this.pagesContainer = document.getElementById('pagesContainer');
    this.textExtractContainer = document.getElementById('textExtractContainer');
    this.optionsContainer = document.getElementById('optionsContainer');

    this.toolSearchInput = document.getElementById('toolSearchInput');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.btnBackToHome = document.getElementById('btnBackToHome');
    this.navLogo = document.getElementById('navLogo');

    // Update initial theme icon
    const curTheme = document.documentElement.getAttribute('data-theme');
    if (this.themeToggleBtn && curTheme === 'dark') {
      this.themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Event Listeners                                                           */
  /* -------------------------------------------------------------------------- */
  bindEvents() {
    // Theme toggle
    this.themeToggleBtn?.addEventListener('click', () => this.toggleTheme());

    // Navigation Logo & Back button
    this.navLogo?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateHome();
    });
    this.btnBackToHome?.addEventListener('click', () => this.navigateHome());

    // Routing by Hash Change
    window.addEventListener('hashchange', () => this.handleRoute());

    // Search input
    this.toolSearchInput?.addEventListener('input', (e) => this.filterTools(e.target.value));

    // Keyboard shortcut '/' for search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.toolSearchInput && !document.activeElement.matches('input, textarea')) {
        e.preventDefault();
        this.toolSearchInput?.focus();
      }
    });

    // Category Tabs Filter
    document.querySelectorAll('.filter-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const category = tab.getAttribute('data-category');
        this.filterCategory(category);
      });
    });

    // Tool Card Click delegation
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.tool-card');
      const toolLink = e.target.closest('.tool-link');
      if (card) {
        const toolId = card.getAttribute('data-tool');
        if (toolId) window.location.hash = `#/${toolId}`;
      } else if (toolLink) {
        e.preventDefault();
        const toolId = toolLink.getAttribute('data-tool');
        if (toolId) window.location.hash = `#/${toolId}`;
      }
    });

    // Dropzone & File Selection
    this.btnSelectFiles?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput.click();
    });

    this.dropzoneContainer?.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.btnAddMoreFiles?.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.btnClearAll?.addEventListener('click', () => {
      this.currentFiles = [];
      this.pageStates = [];
      this.showDropzone();
      this.showToast('Files cleared', 'info');
    });

    this.fileInput?.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files);
      this.fileInput.value = ''; // Reset input
    });

    // Drag & Drop onto Dropzone
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzoneContainer?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzoneContainer.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropzoneContainer?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzoneContainer.classList.remove('drag-over');
      });
    });

    this.dropzoneContainer?.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        this.handleFileSelection(e.dataTransfer.files);
      }
    });

    // Execute Action Button
    this.btnExecuteAction?.addEventListener('click', () => this.executeCurrentTool());

    // Start Over Button
    this.btnStartOver?.addEventListener('click', () => {
      this.currentFiles = [];
      this.pageStates = [];
      this.showDropzone();
    });

    // Download Primary Button Click
    this.btnDownloadPrimary?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.lastResultBlob) {
        PDFEngine.downloadFile(this.lastResultBlob, this.lastResultFilename, this.lastResultMimeType);
        this.showToast('Download started!', 'success');
      } else {
        this.showToast('No file data ready for download.', 'warning');
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Router & View Controller                                                  */
  /* -------------------------------------------------------------------------- */
  handleRoute() {
    const hash = window.location.hash.replace('#/', '').trim();
    if (!hash || hash === '#') {
      this.showHome();
    } else {
      const toolMap = {
        'word-to-pdf': window.Tools.wordToPdf,
        'pdf-to-word': window.Tools.pdfToWord,
        'excel-to-pdf': window.Tools.excelToPdf,
        'pdf-to-excel': window.Tools.pdfToExcel,
        'ppt-to-pdf': window.Tools.pptToPdf,
        'merge': window.Tools.merge,
        'split': window.Tools.split,
        'organize': window.Tools.organize,
        'compress': window.Tools.compress,
        'pdf-to-img': window.Tools.pdfToImg,
        'img-to-pdf': window.Tools.imgToPdf,
        'rotate': window.Tools.rotate,
        'watermark': window.Tools.watermark,
        'page-number': window.Tools.pageNumber,
        'protect': window.Tools.protect,
        'unlock': window.Tools.unlock,
        'sign': window.Tools.sign,
        'bg-remover': window.Tools.bgRemover,
        'extract-text': window.Tools.extractText
      };

      const tool = toolMap[hash];
      if (tool) {
        this.openTool(tool);
      } else {
        this.showHome();
      }
    }
  }

  showHome() {
    this.currentTool = null;
    this.currentFiles = [];
    this.pageStates = [];
    if (this.homeView) this.homeView.style.display = 'block';
    if (this.workspaceSection) this.workspaceSection.classList.remove('active');
    document.title = 'Insight Tools - All-In-One Free & Secure PDF Suite';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateHome() {
    window.location.hash = '';
    this.showHome();
  }

  openTool(tool) {
    this.currentTool = tool;
    this.currentFiles = [];
    this.pageStates = [];

    document.title = `${tool.title} | Insight Tools`;

    // Update Workspace Header Info
    const iconEl = document.getElementById('wsToolIcon');
    const titleEl = document.getElementById('wsToolTitle');
    const descEl = document.getElementById('wsToolDesc');
    const executeTextEl = document.getElementById('btnExecuteText');

    if (titleEl) titleEl.textContent = tool.title;
    if (descEl) descEl.textContent = tool.description;
    if (executeTextEl) executeTextEl.textContent = tool.title;

    // Set file input accept & multiple properties
    if (this.fileInput) {
      this.fileInput.accept = tool.accept || '.pdf';
      this.fileInput.multiple = !!tool.multiple;
    }

    // Format pill update
    const formatPill = document.getElementById('acceptedFormatPill');
    if (formatPill) {
      formatPill.innerHTML = `<i class="fa-solid fa-check"></i> Supports ${tool.accept || '.PDF'}`;
    }

    if (this.homeView) this.homeView.style.display = 'none';
    if (this.workspaceSection) this.workspaceSection.classList.add('active');

    this.showDropzone();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showDropzone() {
    if (this.dropzoneContainer) this.dropzoneContainer.style.display = 'block';
    if (this.activeWorkspace) this.activeWorkspace.style.display = 'none';
    if (this.successScreen) this.successScreen.style.display = 'none';
  }

  showActiveWorkspace() {
    if (this.dropzoneContainer) this.dropzoneContainer.style.display = 'none';
    if (this.activeWorkspace) this.activeWorkspace.style.display = 'grid';
    if (this.successScreen) this.successScreen.style.display = 'none';
  }

  showSuccessScreen(result) {
    if (this.dropzoneContainer) this.dropzoneContainer.style.display = 'none';
    if (this.activeWorkspace) this.activeWorkspace.style.display = 'none';
    if (this.successScreen) this.successScreen.style.display = 'block';

    const descEl = document.getElementById('successDesc');
    if (descEl && result.summary) {
      descEl.textContent = result.summary;
    }

    const downloadTextEl = document.getElementById('btnDownloadText');
    if (downloadTextEl) {
      downloadTextEl.textContent = `Download ${result.filename || 'File'}`;
    }

    this.lastResultBlob = result.data;
    this.lastResultFilename = result.filename;
    this.lastResultMimeType = result.mimeType || 'application/pdf';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* -------------------------------------------------------------------------- */
  /* File Handling & Previews                                                  */
  /* -------------------------------------------------------------------------- */
  async handleFileSelection(fileList) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);

    if (!this.currentTool.multiple) {
      this.currentFiles = [files[0]];
    } else {
      this.currentFiles = [...this.currentFiles, ...files];
    }

    this.showActiveWorkspace();

    // Check if tool is page-level (Organize PDF)
    if (this.currentTool.isPageLevel) {
      await this.loadPdfPagesForOrganize(this.currentFiles[0]);
    } else {
      await this.renderFileCards();
    }

    // Render Options Panel
    if (this.optionsContainer && this.currentTool.renderOptions) {
      let meta = null;
      if (this.currentFiles.length === 1 && this.currentFiles[0].type === 'application/pdf') {
        const pages = await PDFEngine.getPdfPageCount(this.currentFiles[0]);
        meta = { pageCount: pages };
      }
      this.currentTool.renderOptions(this.optionsContainer, meta);
    }
  }

  async renderFileCards() {
    if (!this.filesContainer) return;

    this.filesContainer.style.display = 'grid';
    if (this.pagesContainer) this.pagesContainer.style.display = 'none';
    if (this.textExtractContainer) this.textExtractContainer.style.display = 'none';

    this.filesContainer.innerHTML = '';
    const titleEl = document.getElementById('canvasToolbarTitle');
    if (titleEl) {
      titleEl.textContent = `Selected Files (${this.currentFiles.length})`;
    }

    const total = this.currentFiles.length;

    for (let i = 0; i < total; i++) {
      const file = this.currentFiles[i];
      const card = document.createElement('div');
      card.className = 'file-card-item';
      card.draggable = true;
      card.dataset.index = i;

      card.innerHTML = `
        <div class="file-card-actions">
          <button class="card-action-btn btn-del" data-idx="${i}" title="Remove file">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="file-card-preview" id="filePreview_${i}">
          <i class="fa-solid fa-file-pdf pdf-fallback-icon"></i>
        </div>
        <div class="file-card-name" title="${file.name}">${file.name}</div>
        <div class="file-card-meta">${PDFEngine.formatBytes(file.size)}</div>
      `;

      // Drag reorder events
      card.addEventListener('dragstart', (e) => {
        this.draggedFileIndex = i;
        card.classList.add('dragging');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropIndex = parseInt(card.dataset.index, 10);
        if (this.draggedFileIndex !== null && this.draggedFileIndex !== dropIndex) {
          const item = this.currentFiles.splice(this.draggedFileIndex, 1)[0];
          this.currentFiles.splice(dropIndex, 0, item);
          this.renderFileCards();
        }
      });

      this.filesContainer.appendChild(card);

      // Async render thumbnail
      this.generateFileThumbnail(file, i);
    }

    // Bind delete button
    this.filesContainer.querySelectorAll('.card-action-btn.btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        this.currentFiles.splice(idx, 1);
        if (this.currentFiles.length === 0) {
          this.showDropzone();
        } else {
          this.renderFileCards();
        }
      });
    });
  }

  async generateFileThumbnail(file, index) {
    const previewBox = document.getElementById(`filePreview_${index}`);
    if (!previewBox) return;

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = url;
      previewBox.innerHTML = '';
      previewBox.appendChild(img);
    } else {
      const canvas = document.createElement('canvas');
      const ok = await PDFEngine.renderPageToCanvas(file, 1, canvas, 0.35);
      if (ok) {
        previewBox.innerHTML = '';
        previewBox.appendChild(canvas);
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Page-Level Operations (Organize PDF)                                      */
  /* -------------------------------------------------------------------------- */
  async loadPdfPagesForOrganize(file) {
    if (!this.pagesContainer) return;

    this.filesContainer.style.display = 'none';
    this.pagesContainer.style.display = 'grid';
    if (this.textExtractContainer) this.textExtractContainer.style.display = 'none';
    this.pagesContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--text-muted);">Loading pages preview...</div>';

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    this.pageStates = [];
    for (let i = 1; i <= totalPages; i++) {
      this.pageStates.push({
        originalIndex: i - 1,
        pageNum: i,
        rotation: 0,
        deleted: false
      });
    }

    this.renderPageGrid(pdf);
  }

  async renderPageGrid(pdf) {
    this.pagesContainer.innerHTML = '';
    const titleEl = document.getElementById('canvasToolbarTitle');
    if (titleEl) {
      const activeCount = this.pageStates.filter(p => !p.deleted).length;
      titleEl.textContent = `Pages (${activeCount} of ${this.pageStates.length})`;
    }

    for (let i = 0; i < this.pageStates.length; i++) {
      const state = this.pageStates[i];
      const pageCard = document.createElement('div');
      pageCard.className = `page-card ${state.deleted ? 'page-deleted' : ''}`;
      pageCard.draggable = true;
      pageCard.dataset.index = i;

      pageCard.innerHTML = `
        <div class="page-preview-box" id="pageBox_${i}">
          <canvas id="pageCanvas_${i}" style="transform: rotate(${state.rotation}deg);"></canvas>
          <span class="page-badge-num">${state.pageNum}</span>
        </div>
        <div class="page-card-controls">
          <button type="button" class="page-control-btn btn-rotate-page" data-idx="${i}" title="Rotate 90°">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button type="button" class="page-control-btn btn-del btn-del-page" data-idx="${i}" title="${state.deleted ? 'Restore page' : 'Remove page'}">
            <i class="fa-solid ${state.deleted ? 'fa-arrow-rotate-left' : 'fa-trash'}"></i>
          </button>
        </div>
      `;

      // Drag reorder pages
      pageCard.addEventListener('dragstart', () => {
        this.draggedPageIndex = i;
        pageCard.classList.add('dragging');
      });

      pageCard.addEventListener('dragend', () => {
        pageCard.classList.remove('dragging');
      });

      pageCard.addEventListener('dragover', (e) => e.preventDefault());

      pageCard.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropIndex = parseInt(pageCard.dataset.index, 10);
        if (this.draggedPageIndex !== null && this.draggedPageIndex !== dropIndex) {
          const item = this.pageStates.splice(this.draggedPageIndex, 1)[0];
          this.pageStates.splice(dropIndex, 0, item);
          this.renderPageGrid(pdf);
        }
      });

      this.pagesContainer.appendChild(pageCard);

      // Render page canvas thumbnail
      const canvas = pageCard.querySelector(`#pageCanvas_${i}`);
      if (pdf && canvas) {
        pdf.getPage(state.pageNum).then(page => {
          const viewport = page.getViewport({ scale: 0.3 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
          });
        });
      }
    }

    // Bind rotate individual page button
    this.pagesContainer.querySelectorAll('.btn-rotate-page').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        this.pageStates[idx].rotation = (this.pageStates[idx].rotation + 90) % 360;
        this.updatePageThumbnailsRotation();
      });
    });

    // Bind delete/restore page button
    this.pagesContainer.querySelectorAll('.btn-del-page').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        this.pageStates[idx].deleted = !this.pageStates[idx].deleted;
        this.renderPageGrid(pdf);
      });
    });
  }

  updatePageThumbnailsRotation() {
    this.pageStates.forEach((state, i) => {
      const canvas = document.getElementById(`pageCanvas_${i}`);
      if (canvas) {
        canvas.style.transform = `rotate(${state.rotation}deg)`;
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Tool Execution & Progress                                                 */
  /* -------------------------------------------------------------------------- */
  updateProgress(percent, statusText) {
    const bar = document.getElementById('progressBarFill');
    const percentEl = document.getElementById('progressPercent');
    const subEl = document.getElementById('processStatusSubtitle');

    if (bar) bar.style.width = `${percent}%`;
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (subEl && statusText) subEl.textContent = statusText;
  }

  async executeCurrentTool() {
    if (!this.currentTool) return;
    if (this.currentFiles.length === 0) {
      this.showToast('Please select files first.', 'warning');
      return;
    }

    // Show processing modal
    this.updateProgress(5, 'Preparing document...');
    if (this.processingModal) this.processingModal.classList.add('active');

    try {
      const startTime = Date.now();
      const result = await this.currentTool.execute(this.currentFiles, this);
      const durationMs = Date.now() - startTime;

      // Telemetry event for Admin Console
      try {
        const totalSize = this.currentFiles.reduce((acc, f) => acc + (f.size || 0), 0);
        fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: this.currentTool.id,
            filename: this.currentFiles[0]?.name,
            sizeBytes: totalSize,
            durationMs: durationMs
          })
        }).catch(() => {});
      } catch (e) {}

      setTimeout(() => {
        if (this.processingModal) this.processingModal.classList.remove('active');
        this.showSuccessScreen(result);
        this.showToast('Document processed successfully!', 'success');
      }, 400);

    } catch (err) {
      console.error('Execution error:', err);
      if (this.processingModal) this.processingModal.classList.remove('active');
      this.showToast(err.message || 'An error occurred during processing.', 'error');
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Tool Filtering & Search                                                   */
  /* -------------------------------------------------------------------------- */
  filterTools(query) {
    const q = query.toLowerCase().trim();
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const title = card.querySelector('.tool-title')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.tool-desc')?.textContent.toLowerCase() || '';
      const toolId = card.getAttribute('data-tool')?.toLowerCase() || '';

      if (!q || title.includes(q) || desc.includes(q) || toolId.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  filterCategory(cat) {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const cardCat = card.getAttribute('data-category');
      if (cat === 'all' || cardCat === cat) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Toast Notification System                                                 */
  /* -------------------------------------------------------------------------- */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.App = new InsightApp();
});
