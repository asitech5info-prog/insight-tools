/**
 * Insight Tools - Core PDF Engine Abstraction
 * Powered by pdf-lib, PDF.js, JSZip, and FileSaver
 */

// Initialize PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const PDFEngine = {
  /**
   * Reads a File as an ArrayBuffer
   */
  async readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Reads a File as a Data URL (base64)
   */
  async readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Formats bytes into human readable string (KB, MB, GB)
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Downloads a Blob, Uint8Array, or ArrayBuffer with a filename and correct MIME type
   */
  downloadFile(data, filename, mimeType = 'application/pdf') {
    if (!data) {
      console.error('No data provided to downloadFile');
      return;
    }

    let blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: mimeType });
    } else if (typeof data === 'string') {
      blob = new Blob([data], { type: mimeType || 'text/plain;charset=utf-8' });
    } else {
      blob = new Blob([data], { type: mimeType });
    }

    // Direct object URL creation
    const blobUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.style.display = 'none';
    downloadLink.href = blobUrl;
    downloadLink.download = filename || 'document.pdf';
    
    // Append to document, trigger click, and cleanup
    document.body.appendChild(downloadLink);
    downloadLink.click();

    setTimeout(() => {
      if (document.body.contains(downloadLink)) {
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1500);
  },

  /**
   * Gets total page count of a PDF file
   */
  async getPdfPageCount(arrayBufferOrFile) {
    try {
      const buffer = arrayBufferOrFile instanceof File ? 
        await this.readFileAsArrayBuffer(arrayBufferOrFile) : arrayBufferOrFile;
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      return pdf.numPages;
    } catch (e) {
      console.warn('PDF.js count failed, trying PDFLib:', e);
      try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(arrayBufferOrFile);
        return pdfDoc.getPageCount();
      } catch (err) {
        return 1;
      }
    }
  },

  /**
   * Renders a specific page of a PDF onto an HTML Canvas element
   */
  async renderPageToCanvas(arrayBufferOrFile, pageNum, canvas, scale = 0.5) {
    try {
      const buffer = arrayBufferOrFile instanceof File ? 
        await this.readFileAsArrayBuffer(arrayBufferOrFile) : arrayBufferOrFile;
      
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);
      
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      return true;
    } catch (err) {
      console.error(`Error rendering page ${pageNum} to canvas:`, err);
      // Draw fallback text on canvas
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 200;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Page ${pageNum}`, canvas.width / 2, canvas.height / 2);
      return false;
    }
  },

  /**
   * Parses page range strings like "1, 3-5, 8" into array of 1-based page numbers
   */
  parsePageRange(rangeStr, maxPages) {
    if (!rangeStr || !rangeStr.trim()) {
      return Array.from({ length: maxPages }, (_, i) => i + 1);
    }
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        let start = parseInt(startStr, 10);
        let end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          start = Math.max(1, start);
          end = Math.min(maxPages, end);
          for (let i = start; i <= end; i++) {
            pages.add(i);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= maxPages) {
          pages.add(p);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }
};

window.PDFEngine = PDFEngine;
