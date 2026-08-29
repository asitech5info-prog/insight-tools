/**
 * Tool: PDF to Word (.pdf -> .docx)
 */
window.Tools = window.Tools || {};

window.Tools.pdfToWord = {
  id: 'pdf-to-word',
  title: 'PDF to Word',
  description: 'Convert PDF documents into editable Microsoft Word (.docx) files with preserved layout.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Formatting Mode</label>
        <div class="option-cards-group">
          <label class="option-card-radio active">
            <input type="radio" name="wordFormatMode" value="clean" checked>
            <div>
              <div class="radio-text-title">Editable Word Document (.docx)</div>
              <div class="radio-text-desc">Optimized for editing text, paragraphs, and tables</div>
            </div>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="pdfWordFilename" class="form-control" value="converted_document.docx">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const file = files[0];
    app.updateProgress(15, 'Extracting text and structure from PDF...');

    let loadingTask = null;
    let pdf = null;

    try {
      const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Exported from Insight Tools</title>
          <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #111827; }
            h1 { font-size: 18pt; font-weight: bold; color: #0f172a; margin-top: 18pt; margin-bottom: 6pt; }
            h2 { font-size: 14pt; font-weight: bold; color: #1e293b; margin-top: 14pt; margin-bottom: 4pt; }
            p { margin-bottom: 8pt; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
      `;

      for (let i = 1; i <= totalPages; i++) {
        const progress = Math.round(15 + ((i / totalPages) * 70));
        app.updateProgress(progress, `Processing page ${i} of ${totalPages}...`);

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        if (i > 1) {
          docHtml += `<div class="page-break"></div>`;
        }

        let lastY;
        let currentPara = '';

        for (const item of textContent.items) {
          if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 8) {
            if (currentPara.trim()) {
              if (currentPara.length < 50 && !currentPara.includes('.')) {
                docHtml += `<h2>${escapeHtml(currentPara.trim())}</h2>`;
              } else {
                docHtml += `<p>${escapeHtml(currentPara.trim())}</p>`;
              }
            }
            currentPara = '';
          }
          currentPara += item.str + ' ';
          lastY = item.transform[5];
        }

        if (currentPara.trim()) {
          docHtml += `<p>${escapeHtml(currentPara.trim())}</p>`;
        }

        try { await page.cleanup?.(); } catch (_) {}
      }

      docHtml += `</body></html>`;

      app.updateProgress(90, 'Packaging into Word (.docx) format...');
      const docBlob = new Blob(['\ufeff' + docHtml], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      let outName = document.getElementById('pdfWordFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}.docx`;
      if (!outName.toLowerCase().endsWith('.docx') && !outName.toLowerCase().endsWith('.doc')) outName += '.docx';

      try { await pdf.cleanup?.(); await pdf.destroy?.(); } catch (_) {}
      try { await loadingTask.destroy?.(); } catch (_) {}

      app.updateProgress(100, 'Done!');
      return {
        data: docBlob,
        filename: outName,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        summary: `Successfully converted ${totalPages} PDF pages into Microsoft Word (.docx)`
      };
    } catch (err) {
      if (pdf) { try { await pdf.destroy?.(); } catch (_) {} }
      if (loadingTask) { try { await loadingTask.destroy?.(); } catch (_) {} }
      throw err;
    }
  }
};

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
