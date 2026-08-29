/**
 * Tool: Images to PDF
 */
window.Tools = window.Tools || {};

window.Tools.imgToPdf = {
  id: 'img-to-pdf',
  title: 'Images to PDF',
  description: 'Convert JPG, PNG, and WebP images into a single polished PDF document.',
  accept: '.jpg,.jpeg,.png,.webp',
  multiple: true,

  renderOptions(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Page Orientation</label>
        <select id="imgPdfOrientation" class="form-control">
          <option value="auto" selected>Auto (Match each image)</option>
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Page Size</label>
        <select id="imgPdfPageSize" class="form-control">
          <option value="fit" selected>Fit Image (No empty borders)</option>
          <option value="a4">A4 (210 x 297 mm)</option>
          <option value="letter">US Letter (8.5 x 11 in)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Margin</label>
        <select id="imgPdfMargin" class="form-control">
          <option value="0" selected>No Margin</option>
          <option value="20">Small Margin</option>
          <option value="40">Big Margin</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Output Filename</label>
        <input type="text" id="imgPdfFilename" class="form-control" value="images_document.pdf" placeholder="e.g. images_document.pdf">
      </div>
    `;
  },

  async execute(files, app) {
    if (!files || files.length === 0) {
      throw new Error('Please select at least 1 image file.');
    }

    const { PDFDocument, PageSizes } = PDFLib;
    app.updateProgress(10, 'Initializing new PDF document...');

    const pdfDoc = await PDFDocument.create();
    const orientation = document.getElementById('imgPdfOrientation')?.value || 'auto';
    const pageSizeChoice = document.getElementById('imgPdfPageSize')?.value || 'fit';
    const margin = parseInt(document.getElementById('imgPdfMargin')?.value || '0', 10);

    const total = files.length;
    for (let i = 0; i < total; i++) {
      const file = files[i];
      const progress = Math.round(15 + ((i / total) * 75));
      app.updateProgress(progress, `Processing image ${i + 1} of ${total}: ${file.name}`);

      const buffer = await PDFEngine.readFileAsArrayBuffer(file);
      let embeddedImage;
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

      try {
        if (isPng) {
          embeddedImage = await pdfDoc.embedPng(buffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(buffer);
        }
      } catch (err) {
        // Fallback: draw through canvas if direct embed fails (e.g. WebP or progressive JPG)
        const dataUrl = await PDFEngine.readFileAsDataURL(file);
        const img = new Image();
        img.src = dataUrl;
        await new Promise(r => img.onload = r);

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const pngBuffer = await pngBlob.arrayBuffer();
        embeddedImage = await pdfDoc.embedPng(pngBuffer);
      }

      let imgWidth = embeddedImage.width;
      let imgHeight = embeddedImage.height;

      let pageWidth, pageHeight;

      if (pageSizeChoice === 'a4') {
        [pageWidth, pageHeight] = PageSizes.A4;
      } else if (pageSizeChoice === 'letter') {
        [pageWidth, pageHeight] = PageSizes.Letter;
      } else {
        // Fit exactly to image dimensions plus margin
        pageWidth = imgWidth + (margin * 2);
        pageHeight = imgHeight + (margin * 2);
      }

      // Handle orientation override
      if (pageSizeChoice !== 'fit') {
        if (orientation === 'landscape' && pageWidth < pageHeight) {
          const temp = pageWidth; pageWidth = pageHeight; pageHeight = temp;
        } else if (orientation === 'portrait' && pageWidth > pageHeight) {
          const temp = pageWidth; pageWidth = pageHeight; pageHeight = temp;
        } else if (orientation === 'auto') {
          if (imgWidth > imgHeight && pageWidth < pageHeight) {
            const temp = pageWidth; pageWidth = pageHeight; pageHeight = temp;
          } else if (imgWidth < imgHeight && pageWidth > pageHeight) {
            const temp = pageWidth; pageWidth = pageHeight; pageHeight = temp;
          }
        }
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Calculate scale to fit inside page with margins
      const usableWidth = pageWidth - (margin * 2);
      const usableHeight = pageHeight - (margin * 2);

      const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      const drawX = margin + ((usableWidth - drawWidth) / 2);
      const drawY = margin + ((usableHeight - drawHeight) / 2);

      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
      });
    }

    app.updateProgress(95, 'Saving final PDF...');
    const pdfBytes = await pdfDoc.save();

    let outName = document.getElementById('imgPdfFilename')?.value?.trim() || 'images_document.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    app.updateProgress(100, 'Done!');
    return {
      data: pdfBytes,
      filename: outName,
      mimeType: 'application/pdf',
      summary: `Successfully compiled ${total} image(s) into PDF (${PDFEngine.formatBytes(pdfBytes.length)})`
    };
  }
};
