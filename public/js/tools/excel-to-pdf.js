/**
 * Tool: Excel to PDF Converter
 */
window.Tools = window.Tools || {};

window.Tools.excelToPdf = {
  id: 'excel-to-pdf',
  title: 'Excel to PDF',
  description: 'Convert spreadsheets and workbooks into clean, formatted tabular PDF documents.',
  accept: '.xlsx,.xls,.csv',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Orientation</label>
        <select id="e2pOrientation" class="form-control">
          <option value="landscape" selected>Landscape (Best for Tables & Wide Sheets)</option>
          <option value="portrait">Portrait</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Table Grid Style</label>
        <select id="e2pGridStyle" class="form-control">
          <option value="bordered" selected>Clean Bordered Grid</option>
          <option value="striped">Zebra Striped Rows</option>
          <option value="minimal">Minimalist (Lines Only)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="e2pFilename" class="form-control" value="spreadsheet.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select an Excel or CSV file.');
    }

    const file = files[0];
    app.updateProgress(15, 'Reading workbook data...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    app.updateProgress(35, 'Parsing sheets and formulas...');

    // Use XLSX parser
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
      throw new Error('No readable sheets found in this workbook.');
    }

    const firstSheet = workbook.Sheets[sheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

    if (!jsonData || jsonData.length === 0) {
      throw new Error('The active spreadsheet sheet contains no data.');
    }

    app.updateProgress(60, 'Generating tabular layout and calculating column widths...');

    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    const orientation = document.getElementById('e2pOrientation')?.value || 'landscape';
    const isLandscape = orientation === 'landscape';

    const pageWidth = isLandscape ? 841.89 : 595.28;
    const pageHeight = isLandscape ? 595.28 : 841.89;

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 36;
    const availableWidth = pageWidth - (margin * 2);

    // Calculate columns
    const maxCols = Math.min(Math.max(...jsonData.map(row => row.length)), 12);
    if (maxCols === 0) throw new Error('Spreadsheet has 0 columns.');

    const colWidth = availableWidth / maxCols;
    const rowHeight = 22;
    const fontSize = maxCols > 8 ? 8 : 9;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin - 30;

    // Draw Sheet Title
    currentPage.drawText(`Sheet: ${PDFEngine.sanitizeWinAnsi(sheetNames[0])}`, {
      x: margin,
      y: pageHeight - margin - 15,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.3)
    });

    const rowsPerPage = Math.floor((currentY - margin) / rowHeight);
    let rowIndex = 0;

    for (let r = 0; r < jsonData.length; r++) {
      const rowData = jsonData[r];

      // New Page check
      if (currentY <= margin + rowHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - 20;
      }

      const isHeader = r === 0;

      // Row background
      if (isHeader) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight + 4,
          width: availableWidth,
          height: rowHeight,
          color: rgb(0.9, 0.93, 0.98)
        });
      } else if (r % 2 === 1) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight + 4,
          width: availableWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.99)
        });
      }

      // Draw Cells
      for (let c = 0; c < maxCols; c++) {
        let rawVal = rowData[c] !== undefined && rowData[c] !== null ? String(rowData[c]) : '';
        const val = PDFEngine.sanitizeWinAnsi(rawVal);
        const cellX = margin + (c * colWidth);

        // Cell border
        currentPage.drawRectangle({
          x: cellX,
          y: currentY - rowHeight + 4,
          width: colWidth,
          height: rowHeight,
          borderWidth: 0.5,
          borderColor: rgb(0.85, 0.88, 0.92),
          color: undefined // transparent
        });

        // Truncate cell text if exceeding column with WinAnsi safety
        let truncated = val;
        while (truncated.length > 0 && fontRegular.widthOfTextAtSize(truncated + '..', fontSize) > colWidth - 8) {
          truncated = truncated.slice(0, -1);
        }
        if (truncated !== val && truncated.length > 0) truncated += '..';

        if (truncated) {
          currentPage.drawText(truncated, {
            x: cellX + 4,
            y: currentY - 12,
            size: fontSize,
            font: isHeader ? fontBold : fontRegular,
            color: isHeader ? rgb(0.08, 0.12, 0.25) : rgb(0.2, 0.2, 0.25)
          });
        }
      }

      currentY -= rowHeight;
      rowIndex++;
    }

    app.updateProgress(90, 'Compiling Excel PDF document...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('e2pFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully converted ${sheetNames[0]} (${jsonData.length} rows) into ${pdfDoc.getPageCount()} pages`
    };
  }
};
