/**
 * Tool: PowerPoint to PDF (.pptx -> .pdf)
 */
window.Tools = window.Tools || {};

window.Tools.pptToPdf = {
  id: 'ppt-to-pdf',
  title: 'PowerPoint to PDF',
  description: 'Convert Microsoft PowerPoint presentations (.pptx) into clean, landscape PDF slides.',
  accept: '.pptx,.ppt',
  multiple: false,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Slide Aspect Ratio</label>
        <select id="pptAspectRatio" class="form-control">
          <option value="16:9" selected>Widescreen 16:9 (Standard Modern Presentation)</option>
          <option value="4:3">Standard 4:3 (Traditional Slide)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Slide Theme</label>
        <select id="pptSlideTheme" class="form-control">
          <option value="light" selected>Clean White with Accent Border</option>
          <option value="dark">Modern Dark Slide Theme</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="pptPdfFilename" class="form-control" value="presentation.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select a PowerPoint (.pptx) file.');
    }

    const file = files[0];
    const { PDFDocument, StandardFonts, rgb } = PDFLib;

    app.updateProgress(15, 'Unpacking PowerPoint presentation archive...');
    const arrayBuffer = await PDFEngine.readFileAsArrayBuffer(file);
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find all slide XML files
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

    if (slideFiles.length === 0) {
      throw new Error('No readable slides detected in this presentation.');
    }

    app.updateProgress(35, `Found ${slideFiles.length} slides. Building PDF...`);
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const ratio = document.getElementById('pptAspectRatio')?.value || '16:9';
    const theme = document.getElementById('pptSlideTheme')?.value || 'light';

    // 16:9 is 960x540, 4:3 is 800x600
    const slideWidth = ratio === '4:3' ? 800 : 960;
    const slideHeight = ratio === '4:3' ? 600 : 540;

    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const progress = Math.round(35 + ((i / slideFiles.length) * 55));
      app.updateProgress(progress, `Rendering slide ${i + 1} of ${slideFiles.length}...`);

      const slideXml = await zip.files[slidePath].async('text');
      
      // Extract text content from XML tags: <a:t>...</a:t>
      const textMatches = [];
      const regex = /<a:t[^>]*>([^<]+)<\/a:t>/g;
      let match;
      while ((match = regex.exec(slideXml)) !== null) {
        if (match[1] && match[1].trim()) {
          textMatches.push(match[1].trim());
        }
      }

      const page = pdfDoc.addPage([slideWidth, slideHeight]);

      // Background
      if (theme === 'dark') {
        page.drawRectangle({
          x: 0,
          y: 0,
          width: slideWidth,
          height: slideHeight,
          color: rgb(0.06, 0.09, 0.14)
        });
      } else {
        page.drawRectangle({
          x: 0,
          y: 0,
          width: slideWidth,
          height: slideHeight,
          color: rgb(0.98, 0.99, 1.0)
        });
        // Decorative top bar
        page.drawRectangle({
          x: 0,
          y: slideHeight - 8,
          width: slideWidth,
          height: 8,
          color: rgb(0.31, 0.27, 0.9)
        });
      }

      // Slide number badge
      page.drawText(`Slide ${i + 1}`, {
        x: slideWidth - 75,
        y: 20,
        size: 10,
        font: fontRegular,
        color: theme === 'dark' ? rgb(0.5, 0.55, 0.65) : rgb(0.6, 0.65, 0.75)
      });

      let currentY = slideHeight - 70;
      let isFirst = true;

      for (let text of textMatches) {
        if (currentY < 60) break;

        const isTitle = isFirst;
        const font = isTitle ? fontBold : fontRegular;
        const size = isTitle ? 22 : 14;
        const lineHeight = isTitle ? 32 : 22;

        let textColor;
        if (theme === 'dark') {
          textColor = isTitle ? rgb(0.95, 0.97, 1.0) : rgb(0.8, 0.85, 0.92);
        } else {
          textColor = isTitle ? rgb(0.08, 0.12, 0.22) : rgb(0.2, 0.25, 0.35);
        }

        // Wrap slide line
        const maxWidth = slideWidth - 120;
        const words = text.split(' ');
        let line = '';

        for (let word of words) {
          const test = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
            page.drawText(line, {
              x: 60,
              y: currentY,
              size: size,
              font: font,
              color: textColor
            });
            currentY -= lineHeight;
            line = word;
          } else {
            line = test;
          }
        }

        if (line) {
          page.drawText(line, {
            x: 60,
            y: currentY,
            size: size,
            font: font,
            color: textColor
          });
          currentY -= isTitle ? lineHeight + 12 : lineHeight + 6;
        }

        isFirst = false;
      }
    }

    app.updateProgress(95, 'Saving presentation PDF...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('pptPdfFilename')?.value?.trim() || `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully converted ${slideFiles.length} slides to presentation PDF`
    };
  }
};
