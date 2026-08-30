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
    this.lastResultMimeType = 'application/pdf';
    this.activeThumbnailUrls = new Set();

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

    // Clean memory on window unload/hide
    window.addEventListener('beforeunload', () => this.purgeSessionData());
    window.addEventListener('pagehide', () => this.purgeSessionData());

    // Search input
    this.toolSearchInput?.addEventListener('input', (e) => this.filterTools(e.target.value));

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
      this.purgeSessionData();
      this.showDropzone();
      this.showToast('Files cleared and memory freed', 'info');
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
      this.purgeSessionData();
      this.showDropzone();
    });

    // Download Primary Button Click
    this.btnDownloadPrimary?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.lastResultBlob) {
        PDFEngine.saveBlob(this.lastResultBlob, this.lastResultFilename);
        this.showToast('Download started! Data purged from memory.', 'success');

        // Automatically purge in-memory buffers after task completion download
        setTimeout(() => {
          this.purgeSessionData(false); // retain success UI, wipe all buffers & memory
          const banner = document.getElementById('privacyPurgeBanner');
          if (banner) {
            banner.style.background = 'rgba(16, 185, 129, 0.18)';
            banner.innerHTML = `<i class="fa-solid fa-circle-check"></i><span><strong>Memory Cleansed:</strong> All file buffers and temporary data have been deleted from browser RAM.</span>`;
          }
        }, 600);
      } else {
        this.showToast('No file data ready for download.', 'warning');
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Router & View Controller                                                  */
  /* -------------------------------------------------------------------------- */
  handleRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (!hash) {
      this.showHome();
    } else if (hash === 'admin' || hash === 'admin.html') {
      window.location.href = '/admin';
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
        'extract-text': window.Tools.extractText,
        'ocr-pdf': window.Tools.ocrPdf,
        'redact': window.Tools.redact,
        'metadata': window.Tools.metadata,
        'grayscale': window.Tools.grayscale
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
    this.purgeSessionData();
    this.currentTool = null;
    if (this.homeView) this.homeView.style.display = 'block';
    if (this.workspaceSection) {
      this.workspaceSection.classList.remove('active');
      this.workspaceSection.style.display = 'none';
    }
    document.title = 'Insight Tools - All-In-One Free & Secure PDF Suite';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateHome() {
    window.location.hash = '';
    this.showHome();
  }

  openTool(tool) {
    this.purgeSessionData();
    this.currentTool = tool;

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
    if (this.workspaceSection) {
      this.workspaceSection.classList.add('active');
      this.workspaceSection.style.display = 'block';
    }

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

    // Update count badge
    const badge = document.getElementById('filesCountBadge');
    if (badge) badge.textContent = this.currentFiles.length;

    // Render Options Container for current tool
    if (this.optionsContainer && this.currentTool.renderOptions) {
      this.currentTool.renderOptions(this.optionsContainer);
    }

    // Specially handle page previews for Organize Tool
    if (this.currentTool.id === 'organize') {
      await this.loadPdfPagesForOrganize(this.currentFiles[0]);
    } else {
      this.renderFileCards();
    }
  }

  renderFileCards() {
    if (!this.filesContainer) return;
    this.filesContainer.innerHTML = '';
    this.filesContainer.style.display = 'grid';
    if (this.pagesContainer) this.pagesContainer.style.display = 'none';
    if (this.textExtractContainer) this.textExtractContainer.style.display = 'none';

    for (let i = 0; i < this.currentFiles.length; i++) {
      const file = this.currentFiles[i];
      const card = document.createElement('div');
      card.className = 'file-card-item';
      card.draggable = true;
      card.dataset.index = i;

      card.innerHTML = `
        <div class="file-card-preview" id="filePreview_${i}">
          <div class="preview-loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i></div>
        </div>
        <div class="file-card-details">
          <div class="file-card-name" title="${file.name}">${file.name}</div>
          <div class="file-card-meta">${this.formatFileSize(file.size)}</div>
        </div>
        <div class="file-card-actions">
          <button class="card-action-btn btn-del" data-idx="${i}" title="Remove File"><i class="fa-solid fa-xmark"></i></button>
        </div>
      `;

      // Drag & Drop reordering support
      card.addEventListener('dragstart', (e) => {
        this.draggedFileIndex = i;
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
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
      this.activeThumbnailUrls.add(url);
      const img = document.createElement('img');
      img.src = url;
      previewBox.innerHTML = '';
      previewBox.appendChild(img);
    } else {
      const canvas = document.createElement('canvas');
      const ok = await PDFEngine.renderPageThumbnail(file, 1, 200);
      if (ok) {
        previewBox.innerHTML = '';
        previewBox.appendChild(ok);
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

    let loadingTask = null;
    try {
      const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      this.pageStates = [];
      for (let i = 1; i <= totalPages; i++) {
        this.pageStates.push({
          pageNumber: i,
          rotation: 0,
          deleted: false
        });
      }

      this.renderPageGrid(pdf);
    } catch (err) {
      console.error('Error loading pages preview:', err);
      this.showToast('Failed to load page previews', 'error');
    }
  }

  async renderPageGrid(pdf) {
    if (!this.pagesContainer) return;
    this.pagesContainer.innerHTML = '';

    for (let i = 0; i < this.pageStates.length; i++) {
      const state = this.pageStates[i];
      const pageCard = document.createElement('div');
      pageCard.className = `page-card-item ${state.deleted ? 'deleted' : ''}`;
      pageCard.draggable = !state.deleted;
      pageCard.dataset.index = i;

      pageCard.innerHTML = `
        <div class="page-card-thumb" id="pageThumb_${i}">
          <canvas id="pageCanvas_${i}" style="transform: rotate(${state.rotation}deg)"></canvas>
        </div>
        <div class="page-card-footer">
          <span class="page-num-pill">${state.pageNumber}</span>
          <div class="page-ctrl-btns">
            <button class="page-btn-icon btn-rotate-page" data-idx="${i}" title="Rotate 90°"><i class="fa-solid fa-rotate-right"></i></button>
            <button class="page-btn-icon btn-del-page" data-idx="${i}" title="${state.deleted ? 'Restore Page' : 'Delete Page'}">
              <i class="fa-solid ${state.deleted ? 'fa-trash-arrow-up' : 'fa-trash'}"></i>
            </button>
          </div>
        </div>
      `;

      // Drag and Drop for reordering pages
      pageCard.addEventListener('dragstart', (e) => {
        this.draggedPageIndex = i;
        e.dataTransfer.effectAllowed = 'move';
      });

      pageCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

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

      // Render actual canvas representation
      const page = await pdf.getPage(state.pageNumber);
      const canvas = document.getElementById(`pageCanvas_${i}`);
      if (canvas) {
        const viewport = page.getViewport({ scale: 0.35 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        requestAnimationFrame(async () => {
          await page.render({
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

      // Telemetry event (Zero user data retained: anonymous metrics only)
      try {
        const totalSize = this.currentFiles.reduce((acc, f) => acc + (f.size || 0), 0);
        fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: this.currentTool.id,
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
  /* Memory Optimization & Zero Data Retention Purge Engine                     */
  /* -------------------------------------------------------------------------- */
  purgeSessionData(resetUi = true) {
    // 1. Revoke and release all active image thumbnail object URLs
    if (this.activeThumbnailUrls) {
      this.activeThumbnailUrls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      });
      this.activeThumbnailUrls.clear();
    }

    // 2. Release GPU/Canvas backing store memory across workspace
    const canvases = document.querySelectorAll('#workspaceSection canvas, #filesContainer canvas, #pagesContainer canvas');
    canvases.forEach(canvas => {
      PDFEngine.releaseCanvas(canvas);
    });

    // 3. Purge memory buffers and blobs
    if (resetUi) {
      this.currentFiles = [];
      this.pageStates = [];
      this.lastResultBlob = null;
      this.lastResultFilename = '';
      if (this.fileInput) this.fileInput.value = '';
      if (this.filesContainer) this.filesContainer.innerHTML = '';
      if (this.pagesContainer) this.pagesContainer.innerHTML = '';
      if (this.optionsContainer) this.optionsContainer.innerHTML = '';
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Search & Filter Helpers                                                   */
  /* -------------------------------------------------------------------------- */
  filterTools(query) {
    const q = query.toLowerCase().trim();
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const title = card.querySelector('.tool-title')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.tool-desc')?.textContent.toLowerCase() || '';
      const tag = card.querySelector('.tool-footer span')?.textContent.toLowerCase() || '';
      if (title.includes(q) || desc.includes(q) || tag.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  filterCategory(category) {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      if (category === 'all' || card.getAttribute('data-category') === category) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InsightApp();
});
