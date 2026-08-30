/**
 * Core PDF Engine Utilities
 * High-performance WebAssembly/Canvas and binary stream utilities
 */
window.PDFEngine = {
  // Read File as ArrayBuffer
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file buffer'));
      reader.readAsArrayBuffer(file);
    });
  },

  // Read File as Data URL (for images & previews)
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read data URL'));
      reader.readAsDataURL(file);
    });
  },

  // Read File as Text
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read text'));
      reader.readAsText(file);
    });
  },

  // Format file size in human-readable units
  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // Format date
  formatDate(date) {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString();
  },

  // Get total page count of PDF
  async getPdfPageCount(file) {
    try {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const count = pdf.numPages;
      await pdf.destroy();
      return count;
    } catch (err) {
      console.warn('Unable to get exact PDF page count:', err);
      return 1;
    }
  },

  // Render thumbnail of specific page to canvas
  async renderPageThumbnail(file, pageNum = 1, targetWidth = 200) {
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);

    const viewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport
    }).promise;

    // Explicitly release resources to protect memory limit
    page.cleanup();
    pdf.destroy();

    return canvas;
  },

  // Parse page range string (e.g., "1-3, 5, 8-10")
  parsePageRange(rangeStr, maxPages) {
    if (!rangeStr || !rangeStr.trim()) {
      return Array.from({ length: maxPages }, (_, i) => i + 1);
    }

    const pages = new Set();
    const parts = rangeStr.split(',');

    for (let part of parts) {
      part = part.trim();
      if (!part) continue;

      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        let start = parseInt(startStr, 10);
        let end = parseInt(endStr, 10);

        if (isNaN(start) || start < 1) start = 1;
        if (isNaN(end) || end > maxPages) end = maxPages;

        if (start <= end) {
          for (let p = start; p <= end; p++) {
            if (p <= maxPages) pages.add(p);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= maxPages) {
          pages.add(p);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  },

  // Release canvas RAM explicitly
  releaseCanvas(canvas) {
    if (!canvas) return;
    try {
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, 1, 1);
    } catch (_) {}
  },

  // Trigger telemetry reporting to backend API
  async reportTelemetry(toolId, sizeBytes, durationMs) {
    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: toolId,
          sizeBytes: sizeBytes || 0,
          durationMs: durationMs || 0
        })
      });
    } catch (_) {
      // Non-critical reporting
    }
  },

  // Convert Hex color to RGB object for pdf-lib (values 0-1)
  hexToPdfRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c, 16);
    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255
    };
  },

  // Download Blob directly to client
  saveBlob(data, filename, mimeType = 'application/pdf') {
    if (!data) return;
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    if (window.saveAs) {
      window.saveAs(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    }
  },

  downloadFile(data, filename, mimeType = 'application/pdf') {
    this.saveBlob(data, filename, mimeType);
  },

  // Sanitize text for pdf-lib StandardFonts (WinAnsi / Latin-1 encoding)
  sanitizeWinAnsi(text) {
    if (!text) return '';
    return String(text)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '*')
      .replace(/[^\x00-\xFF]/g, '');
  }
};
