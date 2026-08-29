/**
 * Tool: Extract Text (PDF to Text)
 */
window.Tools = window.Tools || {};

window.Tools.extractText = {
  id: 'extract-text',
  title: 'PDF to Text',
  description: 'Extract all selectable text and words from your PDF document for editing or translation.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Formatting Options</label>
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
          <input type="checkbox" id="includePageHeaders" checked style="accent-color: var(--primary);">
          Include Page Delimiters (e.g. --- Page 1 ---)
        </label>
      </div>

      <div class="form-group">
        <label class="form-label">Output Text File</label>
        <input type="text" id="textFilename" class="form-control" value="extracted_text.txt">
      </div>

      <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
        <button type="button" id="btnCopyExtractedText" class="btn-tool-sm" style="flex: 1; justify-content: center; padding: 0.65rem;">
          <i class="fa-solid fa-copy"></i> Copy Text
        </button>
      </div>
    `;

    document.getElementById('btnCopyExtractedText')?.addEventListener('click', () => {
      const textarea = document.getElementById('extractedTextarea');
      if (textarea && textarea.value) {
        navigator.clipboard.writeText(textarea.value);
        window.App?.showToast('Text copied to clipboard!', 'success');
      } else {
        window.App?.showToast('No text available to copy yet.', 'info');
      }
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const file = files[0];
    const includeHeaders = document.getElementById('includePageHeaders')?.checked ?? true;

    let loadingTask = null;
    let pdf = null;

    try {
      const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let fullText = '';

      for (let i = 1; i <= totalPages; i++) {
        const progress = Math.round(15 + ((i / totalPages) * 75));
        app.updateProgress(progress, `Extracting text from page ${i} of ${totalPages}...`);

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        if (includeHeaders) {
          fullText += `\n--- Page ${i} ---\n\n`;
        }

        let lastY;
        let pageText = '';
        for (const item of textContent.items) {
          if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += item.str + ' ';
          lastY = item.transform[5];
        }

        fullText += pageText.trim() + '\n';
        try { await page.cleanup?.(); } catch (_) {}
      }

      // Show extracted text in workspace container
      const textarea = document.getElementById('extractedTextarea');
      const textContainer = document.getElementById('textExtractContainer');
      const filesContainer = document.getElementById('filesContainer');
      const pagesContainer = document.getElementById('pagesContainer');

      if (textarea && textContainer) {
        textarea.value = fullText.trim();
        textContainer.style.display = 'block';
        if (filesContainer) filesContainer.style.display = 'none';
        if (pagesContainer) pagesContainer.style.display = 'none';
      }

      app.updateProgress(95, 'Preparing text file...');
      const textBlob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });

      let outName = document.getElementById('textFilename')?.value?.trim() || 'extracted_text.txt';
      if (!outName.toLowerCase().endsWith('.txt')) outName += '.txt';

      try { await pdf.cleanup?.(); await pdf.destroy?.(); } catch (_) {}
      try { await loadingTask.destroy?.(); } catch (_) {}

      app.updateProgress(100, 'Done!');
      return {
        data: textBlob,
        filename: outName,
        mimeType: 'text/plain',
        summary: `Successfully extracted text from ${totalPages} pages`
      };
    } catch (err) {
      if (pdf) { try { await pdf.destroy?.(); } catch (_) {} }
      if (loadingTask) { try { await loadingTask.destroy?.(); } catch (_) {} }
      throw err;
    }
  }
};
