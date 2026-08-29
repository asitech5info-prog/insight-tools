/**
 * Tool: Word to PDF (.docx -> .pdf)
 */
window.Tools = window.Tools || {};

window.Tools.wordToPdf = {
  id: 'word-to-pdf',
  title: 'Word to PDF',
  description: 'Convert Microsoft Word documents (.docx) into crisp, high-quality PDF files.',
  accept: '.docx,.doc',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Page Size & Margins</label>
        <select id="wordPdfPageSize" class="form-control">
          <option value="a4" selected>A4 (Standard Document)</option>
          <option value="letter">US Letter</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Font Family</label>
        <select id="wordPdfFont" class="form-control">
          <option value="Helvetica" selected>Helvetica / Arial (Modern Clean)</option>
          <option value="TimesRoman">Times New Roman (Formal Serif)</option>
          <option value="Courier">Courier (Monospace)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="wordPdfFilename" class="form-control" value="converted_word.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a Word (.docx) file.');
    }

    const file = files[0];
    const { PDFDocument, StandardFonts, rgb, PageSizes } = PDFLib;

    app.updateProgress(15, 'Reading Microsoft Word document...');
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);

    let htmlContent = '';
    let rawText = '';

    if (window.mammoth) {
      app.updateProgress(35, 'Parsing Word formatting & headings...');
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      htmlContent = result.value;
      const textResult = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      rawText = textResult.value;
    } else {
      // Fallback text decode
      const decoder = new TextDecoder('utf-8');
      rawText = decoder.decode(arrayBuffer).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    }

    app.updateProgress(60, 'Generating PDF pages...');
    const pdfDoc = await PDFDocument.create();

    const fontChoice = document.getElementById('wordPdfFont')?.value || 'Helvetica';
    let chosenFont, chosenFontBold;
    if (fontChoice === 'TimesRoman') {
      chosenFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      chosenFontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    } else if (fontChoice === 'Courier') {
      chosenFont = await pdfDoc.embedFont(StandardFonts.Courier);
      chosenFontBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
    } else {
      chosenFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      chosenFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    const pageSizeChoice = document.getElementById('wordPdfPageSize')?.value || 'a4';
    const [pageWidth, pageHeight] = pageSizeChoice === 'letter' ? PageSizes.Letter : PageSizes.A4;

    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);
    const lineHeight = 16;
    const fontSize = 11;
    const textColor = rgb(0.1, 0.12, 0.18);

    // Break text into paragraphs
    const paragraphs = rawText.split('\n');
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    for (let p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) {
        currentY -= lineHeight * 0.8;
        if (currentY < margin + lineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }
        continue;
      }

      // Check if it looks like a heading
      const isHeading = trimmed.length < 60 && !trimmed.endsWith('.');
      const activeFont = isHeading ? chosenFontBold : chosenFont;
      const activeFontSize = isHeading ? fontSize + 3 : fontSize;
      const activeLineHeight = isHeading ? lineHeight + 6 : lineHeight;

      // Word wrapping
      const words = trimmed.split(' ');
      let currentLine = '';

      for (let word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = activeFont.widthOfTextAtSize(testLine, activeFontSize);

        if (testWidth > contentWidth && currentLine) {
          if (currentY < margin + activeLineHeight) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }
          currentPage.drawText(currentLine, {
            x: margin,
            y: currentY,
            size: activeFontSize,
            font: activeFont,
            color: isHeading ? rgb(0.05, 0.08, 0.15) : textColor
          });
          currentY -= activeLineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        if (currentY < margin + activeLineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: activeFontSize,
          font: activeFont,
          color: isHeading ? rgb(0.05, 0.08, 0.15) : textColor
        });
        currentY -= activeLineHeight;
      }
    }

    app.updateProgress(90, 'Saving converted PDF...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('wordPdfFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully converted Word document to PDF (${pdfDoc.getPageCount()} pages)`
    };
  }
};
