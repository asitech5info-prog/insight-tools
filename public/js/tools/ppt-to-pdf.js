/**
 * Tool: PowerPoint to PDF Converter
 */
window.Tools = window.Tools || {};

window.Tools.pptToPdf = {
  id: 'ppt-to-pdf',
  title: 'PowerPoint to PDF',
  description: 'Convert PPTX presentations into beautiful landscape slide deck PDFs.',
  accept: '.pptx',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Slide Theme Background</label>
        <select id="p2pTheme" class="form-control">
          <option value="clean" selected>Minimal Clean (Soft Off-White)</option>
          <option value="dark">Executive Dark Navy</option>
          <option value="gradient">Modern Indigo Gradient</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="p2pFilename" class="form-control" value="presentation.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PPTX presentation.');
    }

    const file = files[0];
    app.updateProgress(15, 'Unpacking PowerPoint XML package...');

    const zip = new JSZip();
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const pptZip = await zip.loadAsync(arrayBuffer);

    app.updateProgress(40, 'Extracting slides and textual content...');

    // Locate all slide XML files
    const slideFiles = [];
    pptZip.forEach((relativePath, zipEntry) => {
      if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
        slideFiles.push(zipEntry);
      }
    });

    // Sort slides numerically
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.name.match(/slide(\d+)\.xml/i)[1], 10);
      const numB = parseInt(b.name.match(/slide(\d+)\.xml/i)[1], 10);
      return numA - numB;
    });

    if (slideFiles.length === 0) {
      throw new Error('No slides found in this PPTX archive.');
    }

    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Standard 16:9 Landscape Dimensions (960 x 540 pt)
    const slideWidth = 960;
    const slideHeight = 540;
    const theme = document.getElementById('p2pTheme')?.value || 'clean';

    for (let i = 0; i < slideFiles.length; i++) {
      const progress = Math.round(40 + ((i / slideFiles.length) * 50));
      app.updateProgress(progress, `Rendering slide ${i + 1} of ${slideFiles.length}...`);

      const slideXml = await slideFiles[i].async('string');

      // Parse text nodes from <a:t>
      const textMatches = slideXml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
      const lines = textMatches
        .map(t => PDFEngine.sanitizeWinAnsi(t.replace(/<[^>]+>/g, '').trim()))
        .filter(t => t.length > 0);

      const page = pdfDoc.addPage([slideWidth, slideHeight]);

      // Background Theme
      if (theme === 'dark') {
        page.drawRectangle({
          x: 0, y: 0, width: slideWidth, height: slideHeight,
          color: rgb(0.06, 0.09, 0.16)
        });
      } else if (theme === 'gradient') {
        page.drawRectangle({
          x: 0, y: 0, width: slideWidth, height: slideHeight,
          color: rgb(0.95, 0.96, 1.0)
        });
        // Decorative top bar
        page.drawRectangle({
          x: 0, y: slideHeight - 8, width: slideWidth, height: 8,
          color: rgb(0.38, 0.25, 0.95)
        });
      } else {
        page.drawRectangle({
          x: 0, y: 0, width: slideWidth, height: slideHeight,
          color: rgb(0.98, 0.98, 0.99)
        });
      }

      // Slide Badge / Footer
      page.drawText(`Slide ${i + 1} of ${slideFiles.length}`, {
        x: 40,
        y: 28,
        size: 10,
        font: fontBody,
        color: theme === 'dark' ? rgb(0.6, 0.7, 0.8) : rgb(0.5, 0.55, 0.65)
      });

      let currentY = slideHeight - 80;

      if (lines.length > 0) {
        // First line as Title
        const titleLine = lines[0];
        page.drawText(titleLine, {
          x: 50,
          y: currentY,
          size: 26,
          font: fontTitle,
          color: theme === 'dark' ? rgb(1, 1, 1) : rgb(0.1, 0.15, 0.3)
        });
        currentY -= 50;

        // Remaining lines as Body Points
        for (let j = 1; j < lines.length && currentY > 60; j++) {
          const bodyLine = lines[j];
          page.drawText(`•  ${bodyLine}`, {
            x: 65,
            y: currentY,
            size: 16,
            font: fontBody,
            color: theme === 'dark' ? rgb(0.85, 0.9, 0.95) : rgb(0.25, 0.3, 0.4)
          });
          currentY -= 30;
        }
      } else {
        page.drawText(`Slide ${i + 1}`, {
          x: 50,
          y: currentY,
          size: 24,
          font: fontTitle,
          color: theme === 'dark' ? rgb(0.9, 0.9, 0.9) : rgb(0.2, 0.2, 0.3)
        });
      }
    }

    app.updateProgress(95, 'Saving presentation PDF...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('p2pFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully converted ${slideFiles.length} slides into presentation PDF`
    };
  }
};
