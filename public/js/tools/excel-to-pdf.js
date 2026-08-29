/**
 * Tool: Excel to PDF (.xlsx / .xls -> .pdf)
 */
window.Tools = window.Tools || {};

window.Tools.excelToPdf = {
  id: 'excel-to-pdf',
  title: 'Excel to PDF',
  description: 'Convert Microsoft Excel spreadsheets (.xlsx, .xls) into clean, printable PDF tables.',
  accept: '.xlsx,.xls,.csv',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Orientation</label>
        <select id="excelPdfOrientation" class="form-control">
          <option value="landscape" selected>Landscape (Recommended for Spreadsheets)</option>
          <option value="portrait">Portrait</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Gridlines & Styling</label>
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer; margin-bottom: 0.5rem;">
          <input type="checkbox" id="excelShowGridlines" checked style="accent-color: var(--primary);">
          Show Table Cell Gridlines
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
          <input type="checkbox" id="excelHeaderRow" checked style="accent-color: var(--primary);">
          Highlight First Row as Header
        </label>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="excelPdfFilename" class="form-control" value="converted_spreadsheet.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select an Excel (.xlsx/.xls) file.');
    }

    const file = files[0];
    const { PDFDocument, StandardFonts, rgb, PageSizes } = PDFLib;

    app.updateProgress(15, 'Reading Excel workbook...');
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);

    if (!window.XLSX) {
      throw new Error('Spreadsheet engine loading, please try again in a second.');
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
      throw new Error('No worksheets found in this Excel file.');
    }

    app.updateProgress(40, `Processing ${sheetNames.length} sheet(s)...`);
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const orientation = document.getElementById('excelPdfOrientation')?.value || 'landscape';
    const showGrid = document.getElementById('excelShowGridlines')?.checked ?? true;
    const highlightHeader = document.getElementById('excelHeaderRow')?.checked ?? true;

    let [pageWidth, pageHeight] = PageSizes.A4;
    if (orientation === 'landscape') {
      const temp = pageWidth; pageWidth = pageHeight; pageHeight = temp;
    }

    const margin = 36;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);

    for (let sheetIdx = 0; sheetIdx < sheetNames.length; sheetIdx++) {
      const sheetName = sheetNames[sheetIdx];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawData || rawData.length === 0) continue;

      let maxCols = 0;
      rawData.forEach(row => {
        if (row.length > maxCols) maxCols = row.length;
      });
      if (maxCols === 0) continue;

      const colWidth = Math.min(180, Math.max(70, availableWidth / maxCols));
      const rowHeight = 22;
      const fontSize = 9;

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - margin - 20;

      // Draw Sheet Title
      currentPage.drawText(`Sheet: ${sheetName}`, {
        x: margin,
        y: pageHeight - margin,
        size: 13,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.25)
      });

      for (let r = 0; r < rawData.length; r++) {
        if (currentY < margin + rowHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin - 20;
        }

        const row = rawData[r];
        const isHeader = r === 0 && highlightHeader;

        // Background highlight for header or zebra
        if (isHeader) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - 4,
            width: maxCols * colWidth,
            height: rowHeight,
            color: rgb(0.9, 0.94, 1.0)
          });
        } else if (r % 2 === 1) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - 4,
            width: maxCols * colWidth,
            height: rowHeight,
            color: rgb(0.97, 0.98, 0.99)
          });
        }

        // Draw Cells
        for (let c = 0; c < maxCols; c++) {
          const cellVal = row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
          const cellX = margin + (c * colWidth);

          // Gridlines
          if (showGrid) {
            currentPage.drawRectangle({
              x: cellX,
              y: currentY - 4,
              width: colWidth,
              height: rowHeight,
              borderColor: rgb(0.85, 0.88, 0.92),
              borderWidth: 0.75
            });
          }

          if (cellVal) {
            // Truncate cell text if longer than column
            let textToDraw = cellVal;
            const fontToUse = isHeader ? fontBold : fontRegular;
            while (textToDraw.length > 3 && fontToUse.widthOfTextAtSize(textToDraw, fontSize) > colWidth - 8) {
              textToDraw = textToDraw.substring(0, textToDraw.length - 2) + '…';
            }

            currentPage.drawText(textToDraw, {
              x: cellX + 4,
              y: currentY + 3,
              size: fontSize,
              font: fontToUse,
              color: isHeader ? rgb(0.08, 0.12, 0.22) : rgb(0.18, 0.22, 0.3)
            });
          }
        }

        currentY -= rowHeight;
      }
    }

    app.updateProgress(90, 'Saving converted spreadsheet PDF...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('excelPdfFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully converted Excel spreadsheet to PDF (${pdfDoc.getPageCount()} pages)`
    };
  }
};
