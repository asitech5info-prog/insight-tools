/**
 * Tool: Organize PDF (Visual Page Grid, Reorder, Delete, Rotate)
 */
window.Tools = window.Tools || {};

window.Tools.organize = {
  id: 'organize',
  title: 'Organize PDF',
  description: 'Visually reorder pages, rotate individual sheets, or remove unwanted pages.',
  accept: '.pdf',
  multiple: false,
  isPageLevel: true, // Tells app.js to render page grid instead of file list

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Quick Page Actions</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
          <button type="button" id="btnRotateAllRight" class="btn-tool-sm" style="justify-content: center; padding: 0.6rem;">
            <i class="fa-solid fa-rotate-right"></i> Rotate All 90°
          </button>
          <button type="button" id="btnResetPages" class="btn-tool-sm" style="justify-content: center; padding: 0.6rem;">
            <i class="fa-solid fa-arrow-rotate-left"></i> Reset All
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="organizeFilename" class="form-control" value="organized_document.pdf" placeholder="e.g. organized_document.pdf">
      </div>

      <div style="font-size: 0.82rem; color: var(--text-secondary); background: var(--bg-input); padding: 0.75rem; border-radius: var(--radius-md);">
        <i class="fa-solid fa-circle-info" style="color: var(--primary);"></i>
        Drag pages in the grid on the left to reorder them. Click the trash icon to exclude any page.
      </div>
    `;

    document.getElementById('btnRotateAllRight')?.addEventListener('click', () => {
      if (window.App && window.App.pageStates) {
        window.App.pageStates.forEach(p => {
          p.rotation = (p.rotation + 90) % 360;
        });
        window.App.updatePageThumbnailsRotation();
        window.App.showToast('Rotated all pages 90°', 'info');
      }
    });

    document.getElementById('btnResetPages')?.addEventListener('click', () => {
      if (window.App && window.App.currentFiles[0]) {
        window.App.loadPdfPagesForOrganize(window.App.currentFiles[0]);
        window.App.showToast('Reset pages to original state', 'info');
      }
    });
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please upload a PDF to organize.');
    }

    const pageStates = app.pageStates || [];
    const activePages = pageStates.filter(p => !p.deleted);

    if (activePages.length === 0) {
      throw new Error('You have removed all pages. Please keep at least 1 page in the document.');
    }

    const file = files[0];
    const { PDFDocument, degrees } = PDFLib;
    app.updateProgress(15, 'Loading original document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const newDoc = await PDFDocument.create();

    const total = activePages.length;
    for (let i = 0; i < total; i++) {
      const pageInfo = activePages[i];
      const progress = Math.round(20 + ((i / total) * 70));
      app.updateProgress(progress, `Arranging page ${i + 1} of ${total}...`);

      const [copiedPage] = await newDoc.copyPages(srcDoc, [pageInfo.originalIndex]);
      const currentAngle = copiedPage.getRotation().angle || 0;
      const finalAngle = (currentAngle + pageInfo.rotation) % 360;
      copiedPage.setRotation(degrees(finalAngle));
      newDoc.addPage(copiedPage);
    }

    app.updateProgress(95, 'Saving organized PDF...');
    const pdfBytes = await newDoc.save();

    let outName = document.getElementById('organizeFilename')?.value?.trim() || 'organized_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully saved ${activePages.length} organized pages (${PDFEngine.formatBytes(pdfBytes.length)})`
    };
  }
};
