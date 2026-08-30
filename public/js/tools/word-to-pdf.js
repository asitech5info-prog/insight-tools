/**
 * Tool: Word to PDF Converter
 */
window.Tools = window.Tools || {};

window.Tools.wordToPdf = {
  id: 'word-to-pdf',
  title: 'Word to PDF',
  description: 'Convert DOCX documents into clean, searchable, standardized PDF files.',
  accept: '.docx',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">PDF Page Layout</label>
        <select id="w2pPageSize" class="form-control">
          <option value="A4" selected>A4 Standard (210 x 297 mm)</option>
          <option value="Letter">US Letter (8.5 x 11 in)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Font Family</label>
        <select id="w2pFont" class="form-control">
          <option value="Helvetica" selected>Helvetica / Arial Clean</option>
          <option value="TimesRoman">Times New Roman Classic</option>
          <option value="Courier">Courier Monospace</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Font Size</label>
        <select id="w2pFontSize" class="form-control">
          <option value="10">Compact (10pt)</option>
          <option value="12" selected>Standard (12pt)</option>
          <option value="14">Large (14pt)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="w2pFilename" class="form-control" value="converted_document.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a DOCX file to convert.');
    }

    const file = files[0];
    app.updateProgress(15, 'Reading DOCX document structure...');

    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    app.updateProgress(35, 'Extracting text and formatting...');

    // Use Mammoth to extract raw text & paragraphs
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    const rawText = result.value || '';
    
    if (!rawText.trim()) {
      throw new Error('The DOCX file appears to be empty or contains unsupported media.');
    }

    app.updateProgress(55, 'Generating PDF vector layout...');

    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    const pageSizeChoice = document.getElementById('w2pPageSize')?.value || 'A4';
    const fontChoice = document.getElementById('w2pFont')?.value || 'Helvetica';
    const fontSize = parseInt(document.getElementById('w2pFontSize')?.value || '12', 10);

    // Standard Page Dimensions (points: 72 points per inch)
    const pageWidth = pageSizeChoice === 'Letter' ? 612 : 595.28;
    const pageHeight = pageSizeChoice === 'Letter' ? 792 : 841.89;

    let font;
    if (fontChoice === 'TimesRoman') font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    else if (fontChoice === 'Courier') font = await pdfDoc.embedFont(StandardFonts.Courier);
    else font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const margin = 48; // 0.66 in margins
    const maxLineWidth = pageWidth - (margin * 2);
    const lineHeight = fontSize * 1.45;

    // Split text into paragraphs and sanitize WinAnsi
    const sanitizedText = PDFEngine.sanitizeWinAnsi(rawText);
    const paragraphs = sanitizedText.split(/\r?\n/);
    const lines = [];

    for (let p of paragraphs) {
      p = p.trim();
      if (!p) {
        lines.push(''); // empty line for paragraph spacing
        continue;
      }

      // Word wrapping algorithm with WinAnsi safe font width check
      const words = p.split(/\s+/);
      let currentLine = '';

      for (let word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth <= maxLineWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    app.updateProgress(75, 'Drawing pages and typography...');

    // Layout lines onto pages
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin - fontSize;

    for (let line of lines) {
      if (currentY <= margin + fontSize) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - fontSize;
      }

      if (line !== '') {
        currentPage.drawText(line, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: font,
          color: rgb(0.12, 0.12, 0.15)
        });
      }

      currentY -= lineHeight;
    }

    app.updateProgress(90, 'Finalizing PDF document...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('w2pFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully converted ${file.name} to ${pdfDoc.getPageCount()}-page PDF document`
    };
  }
};
