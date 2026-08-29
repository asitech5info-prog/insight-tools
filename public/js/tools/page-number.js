/**
 * Tool: Page Numbers
 */
window.Tools = window.Tools || {};

window.Tools.pageNumber = {
  id: 'page-number',
  title: 'Page Numbers',
  description: 'Add clear, customizable page numbering (Page X of Y, headers, or footers) to your PDF.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Position</label>
        <select id="pnPosition" class="form-control">
          <option value="bottom-center" selected>Bottom Center</option>
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="top-center">Top Center</option>
          <option value="top-right">Top Right</option>
          <option value="top-left">Top Left</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Numbering Format</label>
        <select id="pnFormat" class="form-control">
          <option value="Page {n} of {total}" selected>Page {n} of {total}</option>
          <option value="Page {n}">Page {n}</option>
          <option value="{n} / {total}">{n} / {total}</option>
          <option value="{n}">{n}</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">First Page to Number</label>
        <input type="number" id="pnStartPage" class="form-control" value="1" min="1">
        <small style="color: var(--text-muted); font-size: 0.78rem;">Set to 2 if page 1 is a cover page</small>
      </div>

      <div class="form-group">
        <label class="form-label">Font Size</label>
        <select id="pnFontSize" class="form-control">
          <option value="10">Small (10 pt)</option>
          <option value="12" selected>Medium (12 pt)</option>
          <option value="14">Large (14 pt)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="pnFilename" class="form-control" value="numbered_document.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PDF file.');
    }

    const file = files[0];
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    app.updateProgress(15, 'Loading PDF document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    const pos = document.getElementById('pnPosition')?.value || 'bottom-center';
    const format = document.getElementById('pnFormat')?.value || 'Page {n} of {total}';
    const startPage = parseInt(document.getElementById('pnStartPage')?.value || '1', 10);
    const fontSize = parseInt(document.getElementById('pnFontSize')?.value || '12', 10);
    const textColor = rgb(0.2, 0.25, 0.33);

    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      if (pageNum < startPage) return; // Skip pages before start

      const n = pageNum - startPage + 1;
      const text = format.replace('{n}', n).replace('{total}', totalPages - startPage + 1);

      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);
      const { width, height } = page.getSize();

      let x, y;
      const margin = 28;

      if (pos.includes('left')) x = margin;
      else if (pos.includes('right')) x = width - textWidth - margin;
      else x = (width - textWidth) / 2;

      if (pos.startsWith('top')) y = height - textHeight - margin;
      else y = margin;

      page.drawText(text, {
        x: x,
        y: y,
        size: fontSize,
        font: font,
        color: textColor
      });
    });

    app.updateProgress(90, 'Saving numbered document...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('pnFilename')?.value?.trim() || 'numbered_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully numbered ${totalPages} pages`
    };
  }
};
