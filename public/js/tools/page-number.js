/**
 * Tool: Page Numbers
 */
window.Tools = window.Tools || {};

window.Tools.pageNumber = {
  id: 'page-number',
  title: 'Page Numbers',
  description: 'Add custom page numbering to the headers or footers of your PDF document.',
  accept: '.pdf',
  multiple: false,

  renderOptions(container, fileMeta) {
    const totalPages = fileMeta ? fileMeta.pageCount : 1;
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Position</label>
        <select id="pnPosition" class="form-control">
          <option value="bottom-center" selected>Bottom Center (Footer)</option>
          <option value="bottom-right">Bottom Right (Footer)</option>
          <option value="bottom-left">Bottom Left (Footer)</option>
          <option value="top-right">Top Right (Header)</option>
          <option value="top-center">Top Center (Header)</option>
        </select>
        <input type="radio" name="pageNumberPosition" value="bottom-center" checked style="display:none;">
      </div>
      <div class="form-group">
        <label class="form-label">Numbering Format</label>
        <select id="pnFormat" class="form-control">
          <option value="page-of-total" selected>Page {n} of {total} (e.g. Page 1 of ${totalPages})</option>
          <option value="simple-number">Simple Number (1, 2, 3...)</option>
          <option value="hyphen">- {n} -</option>
          <option value="slash">{n} / {total}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Starting Page Number</label>
        <input type="number" id="pnStartNum" class="form-control" value="1" min="1">
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
    app.updateProgress(20, 'Loading PDF document...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const position = document.getElementById('pnPosition')?.value || 'bottom-center';
    const format = document.getElementById('pnFormat')?.value || 'page-of-total';
    const startNum = parseInt(document.getElementById('pnStartNum')?.value || '1', 10);

    const pages = pdfDoc.getPages();
    const totalPages = pages.length;
    const fontSize = 10;
    const marginOffset = 30;

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const pageNum = startNum + i;
      let text = '';

      if (format === 'page-of-total') text = `Page ${pageNum} of ${totalPages + startNum - 1}`;
      else if (format === 'simple-number') text = `${pageNum}`;
      else if (format === 'hyphen') text = `- ${pageNum} -`;
      else if (format === 'slash') text = `${pageNum} / ${totalPages + startNum - 1}`;

      const safeText = PDFEngine.sanitizeWinAnsi(text);
      const textWidth = font.widthOfTextAtSize(safeText, fontSize);
      const { width, height } = page.getSize();

      let x, y;

      if (position === 'bottom-center') {
        x = (width / 2) - (textWidth / 2);
        y = marginOffset;
      } else if (position === 'bottom-right') {
        x = width - textWidth - marginOffset;
        y = marginOffset;
      } else if (position === 'bottom-left') {
        x = marginOffset;
        y = marginOffset;
      } else if (position === 'top-right') {
        x = width - textWidth - marginOffset;
        y = height - marginOffset;
      } else if (position === 'top-center') {
        x = (width / 2) - (textWidth / 2);
        y = height - marginOffset;
      }

      page.drawText(safeText, {
        x: x,
        y: y,
        size: fontSize,
        font: font,
        color: rgb(0.35, 0.4, 0.5)
      });
    }

    app.updateProgress(90, 'Saving numbered PDF...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('pnFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}_numbered.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully stamped page numbers on ${totalPages} pages`
    };
  }
};
