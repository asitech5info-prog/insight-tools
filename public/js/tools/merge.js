/**
 * Tool: Merge PDF
 */
window.Tools = window.Tools || {};

window.Tools.merge = {
  id: 'merge',
  title: 'Merge PDF',
  description: 'Combine multiple PDF files into one single document in your chosen order.',
  accept: '.pdf',
  multiple: true,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="mergeFilename" class="form-control" value="merged_document.pdf" placeholder="e.g. merged_document.pdf">
      </div>
      <div class="form-group">
        <label class="form-label">Merge Order</label>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
          Drag and drop the cards on the left to reorder how the documents are merged.
        </p>
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length < 2) {
      throw new Error('Please select at least 2 PDF files to merge.');
    }

    const { PDFDocument } = PDFLib;
    app.updateProgress(10, 'Initializing merged document...');

    const mergedPdf = await PDFDocument.create();
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const progress = Math.round(15 + ((i / totalFiles) * 75));
      app.updateProgress(progress, `Merging file ${i + 1} of ${totalFiles}: ${file.name}`);

      const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    app.updateProgress(95, 'Finalizing merged PDF...');
    const mergedPdfBytes = await mergedPdf.save();
    
    let filename = document.getElementById('mergeFilename')?.value?.trim() || 'merged_document.pdf';
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: mergedPdfBytes,
      filename: filename,
      mimeType: 'application/pdf',
      summary: `Successfully merged ${totalFiles} PDF documents (${PDFEngine.formatBytes(mergedPdfBytes.length)})`
    };
  }
};
